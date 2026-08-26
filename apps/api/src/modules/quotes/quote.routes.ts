import { Router } from 'express';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /api/quotes
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      where: { businessId: req.businessId },
      include: { cliente: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    
    const quotesWithPagos = quotes.map(quote => ({
      ...quote,
      pagos: quote.pagos ? JSON.parse(quote.pagos as string) : [],
    }));
    
    res.json(quotesWithPagos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
});

// GET /api/quotes/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
      include: { cliente: true, items: { include: { product: true } } },
    });
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
    
    const quoteWithPagos = {
      ...quote,
      pagos: quote.pagos ? JSON.parse(quote.pagos as string) : [],
    };
    
    res.json(quoteWithPagos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
});

// POST /api/quotes
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clienteId, items, metodoPago, pagos, observacion, direccionEnvio, origenCompra } = req.body;

    const serieRecord = await prisma.series.findFirst({
      where: { tipo: 'COTIZACION', businessId: req.businessId },
    });

    if (!serieRecord) return res.status(400).json({ error: 'Serie no encontrada' });

    const nuevoCorrelativo = serieRecord.numeroActual + 1;

    // Los precios ya incluyen IGV, calculamos subtotal dividiendo entre 1.18
    let totalSinIGV = 0;
    const itemsData = items.map((item: any) => {
      const precioUnit = Number(item.precioUnit);
      const itemTotal = precioUnit * item.cantidad;
      totalSinIGV += itemTotal;
      return {
        productId: item.productId,
        cantidad: item.cantidad,
        precioUnit: precioUnit,
        subtotal: itemTotal,
        descuento: item.descuento || 0,
      };
    });

    const total = totalSinIGV;
    const subtotal = total / 1.18;
    const igv = total - subtotal;

    const quote = await prisma.quote.create({
      data: {
        serie: serieRecord.prefijo,
        correlativo: nuevoCorrelativo,
        clienteId: clienteId || null,
        subtotal,
        igv,
        total,
        metodoPago: metodoPago || 'Efectivo',
        pagos: JSON.stringify(pagos || [{ metodo: metodoPago || 'Efectivo', monto: Number(total) }]),
        observacion,
        direccionEnvio,
        origenCompra,
        businessId: req.businessId!,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    await prisma.series.update({
      where: { id: serieRecord.id },
      data: { numeroActual: nuevoCorrelativo },
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Error al crear cotización:', error);
    res.status(500).json({ error: 'Error al crear cotización' });
  }
});

// PUT /api/quotes/:id/convert (ANTES que PUT /api/quotes/:id)
router.put('/:id/convert', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
      include: { items: true },
    });

    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

    const serieRecord = await prisma.series.findFirst({
      where: { tipo: 'NOTA_VENTA', businessId: req.businessId },
    });

    if (!serieRecord) return res.status(400).json({ error: 'Serie de nota de venta no encontrada' });

    const nuevoCorrelativo = serieRecord.numeroActual + 1;

    const sale = await prisma.sale.create({
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

    await prisma.series.update({
      where: { id: serieRecord.id },
      data: { numeroActual: nuevoCorrelativo },
    });

    await prisma.quote.update({
      where: { id: quote.id },
      data: { estado: 'Convertida' },
    });

    res.json(sale);
  } catch (error) {
    console.error('Error al convertir cotización:', error);
    res.status(500).json({ error: 'Error al convertir cotización' });
  }
});

// PUT /api/quotes/:id (DESPUÉS de convert)
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { clienteId, items, metodoPago, pagos, observacion, direccionEnvio, origenCompra } = req.body;

    const existingQuote = await prisma.quote.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });

    if (!existingQuote) return res.status(404).json({ error: 'Cotización no encontrada' });

    // Los precios ya incluyen IGV, calculamos subtotal dividiendo entre 1.18
    let totalSinIGV = 0;
    const itemsData = items.map((item: any) => {
      const precioUnit = Number(item.precioUnit);
      const itemTotal = precioUnit * item.cantidad;
      totalSinIGV += itemTotal;
      return {
        productId: item.productId,
        cantidad: item.cantidad,
        precioUnit: precioUnit,
        subtotal: itemTotal,
        descuento: item.descuento || 0,
      };
    });

    const total = totalSinIGV;
    const subtotal = total / 1.18;
    const igv = total - subtotal;

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
        metodoPago: metodoPago || 'Efectivo',
        pagos: JSON.stringify(pagos || [{ metodo: metodoPago || 'Efectivo', monto: Number(total) }]),
        observacion,
        direccionEnvio,
        origenCompra,
        items: { create: itemsData },
      },
      include: { items: true },
    });

    res.json(quote);
  } catch (error) {
    console.error('Error al actualizar cotización:', error);
    res.status(500).json({ error: 'Error al actualizar cotización' });
  }
});

// DELETE /api/quotes/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.quoteItem.deleteMany({
      where: { quoteId: req.params.id as string },
    });
    await prisma.quote.delete({
      where: { id: req.params.id as string },
    });
    res.json({ message: 'Cotización eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
});

export default router;
