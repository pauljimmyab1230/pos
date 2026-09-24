import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// ==================== VALIDACIONES ====================
const quoteItemSchema = z.object({
  productId: z.string().min(1, 'ID de producto requerido'),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
  precioUnit: z.number().positive('El precio debe ser mayor a 0'),
  descuento: z.number().min(0).optional().default(0),
});

const quoteSchema = z.object({
  clienteId: z.string().optional().nullable(),
  items: z.array(quoteItemSchema).min(1, 'Debe agregar al menos un producto'),
  metodoPago: z.string().default('Efectivo'),
  pagos: z.array(z.object({
    metodo: z.string(),
    monto: z.number().min(0),
  })).optional(),
  observacion: z.string().max(200).optional().nullable(),
  direccionEnvio: z.string().max(200).optional().nullable(),
  origenCompra: z.string().max(100).optional().nullable(),
});

// ==================== RUTAS ====================

// GET /api/quotes - Listar cotizaciones con paginación
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { search, estado, page, limit } = req.query;

    const where: any = { businessId: req.businessId };

    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { serie: { contains: String(search), mode: 'insensitive' } },
        { cliente: { 
          OR: [
            { nombres: { contains: String(search), mode: 'insensitive' } },
            { apellidos: { contains: String(search), mode: 'insensitive' } },
            { razonSocial: { contains: String(search), mode: 'insensitive' } },
          ]
        }},
      ];
    }

    // Paginación
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
    const skip = (pageNum - 1) * pageSize;

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: { cliente: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.quote.count({ where }),
    ]);

    const quotesWithPagos = quotes.map(quote => ({
      ...quote,
      pagos: (() => {
        try {
          return quote.pagos ? JSON.parse(quote.pagos as string) : [];
        } catch {
          return [];
        }
      })(),
    }));

    res.json({
      data: quotesWithPagos,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

// GET /api/quotes/:id - Obtener cotización por ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
      include: { cliente: true, items: { include: { product: true } } },
    });
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
    
    const quoteWithPagos = {
      ...quote,
      pagos: (() => {
        try {
          return quote.pagos ? JSON.parse(quote.pagos as string) : [];
        } catch {
          return [];
        }
      })(),
    };
    
    res.json(quoteWithPagos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
});

// POST /api/quotes - Crear cotización
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = quoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const { clienteId, items, metodoPago, pagos, observacion, direccionEnvio, origenCompra } = parsed.data;

    // Obtener IGV del negocio
    const business = await prisma.business.findUnique({
      where: { id: req.businessId! },
      select: { igv: true },
    });
    const igvRate = (business?.igv || 18) / 100;
    const igvMultiplier = 1 + igvRate;

    const serieRecord = await prisma.series.findFirst({
      where: { tipo: 'COTIZACION', businessId: req.businessId },
    });

    if (!serieRecord) return res.status(400).json({ error: 'Serie no encontrada' });

    const nuevoCorrelativo = serieRecord.numeroActual + 1;

    // Calcular totales con IGV dinámico
    const total = items.reduce((sum, item) => sum + item.precioUnit * item.cantidad, 0);
    const subtotal = total / igvMultiplier;
    const igv = total - subtotal;

    const itemsData = items.map((item) => ({
      productId: item.productId,
      cantidad: item.cantidad,
      precioUnit: item.precioUnit,
      subtotal: (item.precioUnit * item.cantidad) / igvMultiplier,
      descuento: item.descuento || 0,
    }));

    // Usar transacción para garantizar atomicidad
    const quote = await prisma.$transaction(async (tx) => {
      const newQuote = await tx.quote.create({
        data: {
          serie: serieRecord.prefijo,
          correlativo: nuevoCorrelativo,
          clienteId: clienteId || null,
          subtotal,
          igv,
          total,
          metodoPago,
          pagos: JSON.stringify(pagos || [{ metodo: metodoPago, monto: total }]),
          observacion,
          direccionEnvio,
          origenCompra,
          businessId: req.businessId!,
          items: { create: itemsData },
        },
        include: { items: true, cliente: true },
      });

      await tx.series.update({
        where: { id: serieRecord.id },
        data: { numeroActual: nuevoCorrelativo },
      });

      return newQuote;
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Error al crear cotización:', error);
    res.status(500).json({ error: 'Error al crear cotización' });
  }
});

// PUT /api/quotes/:id/convert - Convertir cotización a venta
// DEBE IR ANTES de PUT /:id para evitar conflictos
router.put('/:id/convert', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
      include: { items: { include: { product: true } } },
    });

    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (quote.estado === 'Convertida') return res.status(400).json({ error: 'La cotización ya fue convertida' });
    if (quote.estado === 'Anulada') return res.status(400).json({ error: 'No se puede convertir una cotización anulada' });

    // Obtener IGV del negocio
    const business = await prisma.business.findUnique({
      where: { id: req.businessId! },
      select: { igv: true },
    });

    const serieRecord = await prisma.series.findFirst({
      where: { tipo: 'NOTA_VENTA', businessId: req.businessId },
    });

    if (!serieRecord) return res.status(400).json({ error: 'Serie de nota de venta no encontrada' });

    const nuevoCorrelativo = serieRecord.numeroActual + 1;

    // Usar transacción para crear venta y actualizar stock
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          tipo: 'NOTA_VENTA',
          serie: serieRecord.prefijo,
          correlativo: nuevoCorrelativo,
          clienteId: quote.clienteId,
          subtotal: quote.subtotal,
          igv: quote.igv,
          total: quote.total,
          metodoPago: quote.metodoPago,
          businessId: req.businessId!,
          items: {
            create: quote.items.map((item: any) => ({
              productId: item.productId,
              cantidad: item.cantidad,
              precioUnit: item.precioUnit,
              subtotal: item.subtotal,
              descuento: item.descuento,
            })),
          },
          payments: {
            create: [{ metodo: quote.metodoPago, monto: quote.total }],
          },
        },
      });

      // Actualizar stock
      for (const item of quote.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product && product.tipo === 'Producto') {
          if (product.stock < item.cantidad) {
            throw new Error(`Stock insuficiente para ${product.nombre}. Stock actual: ${product.stock}`);
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.cantidad } },
          });
        }
      }

      return newSale;
    });

    await prisma.series.update({
      where: { id: serieRecord.id },
      data: { numeroActual: nuevoCorrelativo },
    });

    await prisma.quote.update({
      where: { id: quote.id },
      data: { estado: 'Convertida' },
    });

    res.json(sale);
  } catch (error: any) {
    console.error('Error al convertir cotización:', error);
    if (error.message?.includes('Stock insuficiente')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error al convertir cotización' });
  }
});

// PUT /api/quotes/:id - Actualizar cotización
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = quoteSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const existingQuote = await prisma.quote.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });

    if (!existingQuote) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (existingQuote.estado === 'Convertida') {
      return res.status(400).json({ error: 'No se puede modificar una cotización convertida' });
    }
    if (existingQuote.estado === 'Anulada') {
      return res.status(400).json({ error: 'No se puede modificar una cotización anulada' });
    }

    const { clienteId, items, metodoPago, pagos, observacion, direccionEnvio, origenCompra } = parsed.data;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }

    // Obtener IGV del negocio
    const business = await prisma.business.findUnique({
      where: { id: req.businessId! },
      select: { igv: true },
    });
    const igvRate = (business?.igv || 18) / 100;
    const igvMultiplier = 1 + igvRate;

    // Calcular totales con IGV dinámico
    const total = items.reduce((sum, item) => sum + item.precioUnit * item.cantidad, 0);
    const subtotal = total / igvMultiplier;
    const igv = total - subtotal;

    const itemsData = items.map((item) => ({
      productId: item.productId,
      cantidad: item.cantidad,
      precioUnit: item.precioUnit,
      subtotal: (item.precioUnit * item.cantidad) / igvMultiplier,
      descuento: item.descuento || 0,
    }));

    await prisma.quoteItem.deleteMany({
      where: { quoteId: existingQuote.id },
    });

    const quote = await prisma.quote.update({
      where: { id: existingQuote.id },
      data: {
        clienteId: clienteId || null,
        subtotal,
        igv,
        total,
        metodoPago,
        pagos: JSON.stringify(pagos || [{ metodo: metodoPago, monto: total }]),
        observacion,
        direccionEnvio,
        origenCompra,
        items: { create: itemsData },
      },
      include: { items: true, cliente: true },
    });

    res.json(quote);
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
});

// DELETE /api/quotes/:id - Eliminar cotización
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const existingQuote = await prisma.quote.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });
    
    if (!existingQuote) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    if (existingQuote.estado === 'Convertida') {
      return res.status(400).json({ error: 'No se puede eliminar una cotización convertida' });
    }

    await prisma.quoteItem.deleteMany({
      where: { quoteId: req.params.id as string },
    });
    await prisma.quote.delete({
      where: { id: req.params.id as string },
    });
    res.json({ message: 'Cotización eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
});

export default router;
