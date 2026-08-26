import { Router } from 'express';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /api/sales
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tipo, desde, hasta, clienteId } = req.query;

    const where: any = { businessId: req.businessId };

    if (tipo) where.tipo = tipo;
    if (clienteId) where.clienteId = clienteId;
    if (desde || hasta) {
      where.fechaEmision = {};
      if (desde) where.fechaEmision.gte = new Date(String(desde));
      if (hasta) where.fechaEmision.lte = new Date(String(hasta) + 'T23:59:59');
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        cliente: true,
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(sales);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// GET /api/sales/daily
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

// GET /api/sales/:id
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

// POST /api/sales
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      tipo, clienteId, items, metodoPago, tipoPago,
      observacion, direccionEnvio, origenCompra, pagos,
    } = req.body;

    // Obtener serie y correlativo
    const serieRecord = await prisma.series.findFirst({
      where: {
        tipo: tipo === 'BOLETA' ? 'BOLETA' : tipo === 'FACTURA' ? 'FACTURA' : 'NOTA_VENTA',
        businessId: req.businessId,
      },
    });

    if (!serieRecord) {
      return res.status(400).json({ error: 'Serie no encontrada' });
    }

    const nuevoCorrelativo = serieRecord.numeroActual + 1;
    const prefijo = serieRecord.prefijo;

    // Los precios ya incluyen IGV, calculamos correctamente
    const total = items.reduce((sum: number, item: any) => sum + Number(item.precioUnit) * item.cantidad, 0);
    const subtotal = total / 1.18;
    const igvTotal = total - subtotal;

    const itemsData = items.map((item: any) => ({
      productId: item.productId,
      cantidad: item.cantidad,
      precioUnit: Number(item.precioUnit),
      subtotal: Number(item.precioUnit) * item.cantidad / 1.18,
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
          metodoPago: metodoPago || 'Efectivo',
          tipoPago: tipoPago || 'Contado',
          observacion,
          direccionEnvio,
          origenCompra,
          businessId: req.businessId!,
          userId: req.userId,
          items: { create: itemsData },
          payments: pagos
            ? { create: pagos.map((p: any) => ({ metodo: p.metodo, monto: p.monto })) }
            : { create: [{ metodo: metodoPago || 'Efectivo', monto: total }] },
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
        if (product && product.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para ${product.nombre}. Stock actual: ${product.stock}`);
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.cantidad } },
        });
      }

      return newSale;
    });

    res.status(201).json(sale);
  } catch (error: any) {
    console.error('Error al crear venta:', error);
    if (error.message?.includes('Stock insuficiente')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error al crear venta' });
  }
});

// PUT /api/sales/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tipo } = req.body;

    const sale = await prisma.sale.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });

    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });

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

// PUT /api/sales/:id/cancel
router.put('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const sale = await prisma.sale.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
      include: { items: true },
    });

    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    if (sale.estado === 'Anulada') return res.status(400).json({ error: 'La venta ya fue anulada' });

    // Usar transacción para restaurar stock y anular venta
    await prisma.$transaction(async (tx) => {
      // Restaurar stock
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.cantidad } },
        });
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
