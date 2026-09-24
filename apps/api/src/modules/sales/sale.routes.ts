import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// ==================== VALIDACIONES ====================
const saleItemSchema = z.object({
  productId: z.string().uuid('ID de producto inválido'),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
  precioUnit: z.number().positive('El precio debe ser mayor a 0'),
  descuento: z.number().min(0).optional().default(0),
});

const saleSchema = z.object({
  tipo: z.enum(['NOTA_VENTA', 'BOLETA', 'FACTURA']).default('NOTA_VENTA'),
  clienteId: z.string().uuid().optional().nullable(),
  items: z.array(saleItemSchema).min(1, 'Debe agregar al menos un producto'),
  metodoPago: z.enum(['Efectivo', 'Transferencia', 'Tarjeta', 'Yape', 'Plin']).default('Efectivo'),
  tipoPago: z.enum(['Contado', 'Credito']).default('Contado'),
  observacion: z.string().max(200).optional().nullable(),
  direccionEnvio: z.string().max(200).optional().nullable(),
  origenCompra: z.string().max(100).optional().nullable(),
  pagos: z.array(z.object({
    metodo: z.string(),
    monto: z.number().positive(),
  })).optional(),
});

// ==================== RUTAS ====================

// GET /api/sales - Listar ventas con paginación
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tipo, desde, hasta, clienteId, page, limit } = req.query;

    const where: any = { businessId: req.businessId };

    if (tipo) where.tipo = tipo;
    if (clienteId) where.clienteId = clienteId;
    if (desde || hasta) {
      where.fechaEmision = {};
      if (desde) where.fechaEmision.gte = new Date(String(desde));
      if (hasta) where.fechaEmision.lte = new Date(String(hasta) + 'T23:59:59');
    }

    // Paginación
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
    const skip = (pageNum - 1) * pageSize;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          cliente: true,
          items: { include: { product: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      data: sales,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// GET /api/sales/daily - Resumen del día
router.get('/daily', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await prisma.sale.findMany({
      where: {
        businessId: req.businessId,
        estado: 'Activa',
        fechaEmision: { gte: today, lt: tomorrow },
      },
    });

    const comprobantes = sales.length;
    const ingresos = sales.reduce((sum, s) => sum + Number(s.total), 0);

    const gastos = await prisma.expense.findMany({
      where: {
        businessId: req.businessId,
        pagado: true,
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    const egresos = gastos.reduce((sum, e) => sum + Number(e.monto), 0);

    res.json({
      comprobantes,
      ingresos,
      egresos,
      saldo: ingresos - egresos,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener resumen del día' });
  }
});

// GET /api/sales/:id - Obtener venta por ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const sale = await prisma.sale.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
      include: {
        cliente: true,
        items: { include: { product: true } },
        payments: true,
      },
    });
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener venta' });
  }
});

// POST /api/sales - Crear venta
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = saleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const { tipo, clienteId, items, metodoPago, tipoPago, observacion, direccionEnvio, origenCompra, pagos } = parsed.data;

    // Obtener IGV del negocio
    const business = await prisma.business.findUnique({
      where: { id: req.businessId! },
      select: { igv: true },
    });
    const igvRate = (business?.igv || 18) / 100;
    const igvMultiplier = 1 + igvRate;

    // Obtener serie y correlativo
    const serieRecord = await prisma.series.findFirst({
      where: {
        tipo: tipo === 'BOLETA' ? 'BOLETA' : tipo === 'FACTURA' ? 'FACTURA' : 'NOTA_VENTA',
        businessId: req.businessId,
      },
    });

    if (!serieRecord) {
      return res.status(400).json({ error: 'Serie no encontrada para este tipo de documento' });
    }

    const nuevoCorrelativo = serieRecord.numeroActual + 1;
    const prefijo = serieRecord.prefijo;

    // Calcular totales con IGV dinámico
    const total = items.reduce((sum, item) => sum + item.precioUnit * item.cantidad, 0);
    const subtotal = total / igvMultiplier;
    const igvTotal = total - subtotal;

    const itemsData = items.map((item) => ({
      productId: item.productId,
      cantidad: item.cantidad,
      precioUnit: item.precioUnit,
      subtotal: (item.precioUnit * item.cantidad) / igvMultiplier,
      descuento: item.descuento || 0,
    }));

    // Usar transacción para garantizar atomicidad
    const sale = await prisma.$transaction(async (tx) => {
      // Crear venta
      const newSale = await tx.sale.create({
        data: {
          tipo,
          serie: prefijo,
          correlativo: nuevoCorrelativo,
          clienteId: clienteId || null,
          subtotal,
          igv: igvTotal,
          total,
          metodoPago,
          tipoPago,
          observacion,
          direccionEnvio,
          origenCompra,
          businessId: req.businessId!,
          userId: req.userId,
          items: { create: itemsData },
          payments: pagos
            ? { create: pagos.map((p) => ({ metodo: p.metodo, monto: p.monto })) }
            : { create: [{ metodo: metodoPago, monto: total }] },
        },
        include: { items: true, payments: true },
      });

      // Actualizar correlativo de serie
      await tx.series.update({
        where: { id: serieRecord.id },
        data: { numeroActual: nuevoCorrelativo },
      });

      // Actualizar stock (validar stock suficiente)
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado`);
        }
        if (product.tipo === 'Producto' && product.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para ${product.nombre}. Stock actual: ${product.stock}`);
        }
        // Solo decrementar stock si es producto (no servicio)
        if (product.tipo === 'Producto') {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.cantidad } },
          });
        }
      }

      return newSale;
    });

    res.status(201).json(sale);
  } catch (error: any) {
    console.error('Error al crear venta:', error);
    if (error.message?.includes('Stock insuficiente') || error.message?.includes('no encontrado')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error al crear venta' });
  }
});

// PUT /api/sales/:id - Actualizar venta (solo tipo de documento)
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tipo } = req.body;

    if (!tipo || !['NOTA_VENTA', 'BOLETA', 'FACTURA'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    const sale = await prisma.sale.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });

    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    if (sale.estado === 'Anulada') return res.status(400).json({ error: 'No se puede modificar una venta anulada' });

    // Obtener la serie correspondiente al nuevo tipo
    const serieRecord = await prisma.series.findFirst({
      where: {
        tipo: tipo === 'BOLETA' ? 'BOLETA' : tipo === 'FACTURA' ? 'FACTURA' : 'NOTA_VENTA',
        businessId: req.businessId,
      },
    });

    if (!serieRecord) return res.status(400).json({ error: 'Serie no encontrada para el tipo de documento' });

    const nuevoCorrelativo = serieRecord.numeroActual + 1;

    const updated = await prisma.$transaction(async (tx) => {
      // Actualizar la venta
      const saleUpdated = await tx.sale.update({
        where: { id: req.params.id as string },
        data: {
          tipo,
          serie: serieRecord.prefijo,
          correlativo: nuevoCorrelativo,
        },
      });

      // Actualizar correlativo de serie
      await tx.series.update({
        where: { id: serieRecord.id },
        data: { numeroActual: nuevoCorrelativo },
      });

      return saleUpdated;
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar venta:', error);
    res.status(500).json({ error: 'Error al actualizar venta' });
  }
});

// PUT /api/sales/:id/cancel - Anular venta
router.put('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const sale = await prisma.sale.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
      include: { items: { include: { product: true } } },
    });

    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    if (sale.estado === 'Anulada') return res.status(400).json({ error: 'La venta ya fue anulada' });

    // Usar transacción para restaurar stock y anular venta
    await prisma.$transaction(async (tx) => {
      // Restaurar stock solo si es producto (no servicio)
      for (const item of sale.items) {
        if (item.product.tipo === 'Producto') {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.cantidad } },
          });
        }
      }

      // Anular venta
      await tx.sale.update({
        where: { id: req.params.id as string },
        data: { estado: 'Anulada' },
      });
    });

    res.json({ message: 'Venta anulada correctamente' });
  } catch (error) {
    console.error('Error al anular venta:', error);
    res.status(500).json({ error: 'Error al anular venta' });
  }
});

export default router;
