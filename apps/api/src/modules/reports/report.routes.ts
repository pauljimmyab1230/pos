import { Router } from 'express';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /api/reports/sales
router.get('/sales', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { desde, hasta } = req.query;

    const where: any = {
      businessId: req.businessId,
      estado: 'Activa',
    };

    if (desde || hasta) {
      where.fechaEmision = {};
      if (desde) where.fechaEmision.gte = new Date(String(desde));
      if (hasta) where.fechaEmision.lte = new Date(String(hasta) + 'T23:59:59');
    }

    const sales = await prisma.sale.findMany({
      where,
      include: { cliente: true, items: true },
      orderBy: { fechaEmision: 'desc' },
    });

    const totalVentas = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalIGV = sales.reduce((sum, s) => sum + Number(s.igv), 0);

    res.json({
      ventas: sales,
      resumen: {
        totalVentas,
        totalIGV,
        cantidadComprobantes: sales.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

// GET /api/reports/monthly
router.get('/monthly', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const sales = await prisma.sale.findMany({
      where: {
        businessId: req.businessId,
        estado: 'Activa',
        fechaEmision: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const totalVentas = sales.reduce((sum, s) => sum + Number(s.total), 0);

    res.json({
      mes: now.toLocaleString('es-PE', { month: 'long', year: 'numeric' }),
      totalVentas,
      cantidadComprobantes: sales.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reporte mensual' });
  }
});

// GET /api/reports/products
router.get('/products', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { businessId: req.businessId, activo: true },
      orderBy: { nombre: 'asc' },
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reporte de productos' });
  }
});

// GET /api/reports/clients
router.get('/clients', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { businessId: req.businessId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reporte de clientes' });
  }
});

export default router;
