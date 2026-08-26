import { Router } from 'express';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /api/cashbox/balance
router.get('/balance', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const movimientos = await prisma.cashboxMovement.findMany({
      where: {
        businessId: req.businessId,
        fecha: { gte: today, lt: tomorrow },
      },
    });

    const ingresos = movimientos
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const egresos = movimientos
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    res.json({
      ingresos,
      egresos,
      saldo: ingresos - egresos,
      movimientos,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener balance' });
  }
});

// POST /api/cashbox/movement
router.post('/movement', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tipo, concepto, monto, categoria, comprobante } = req.body;

    const movement = await prisma.cashboxMovement.create({
      data: {
        tipo,
        concepto,
        monto,
        categoria,
        comprobante,
        businessId: req.businessId!,
        userId: req.userId,
      },
    });

    res.status(201).json(movement);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
});

// GET /api/cashbox/history
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { desde, hasta } = req.query;

    const where: any = { businessId: req.businessId };

    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(String(desde));
      if (hasta) where.fecha.lte = new Date(String(hasta) + 'T23:59:59');
    }

    const movimientos = await prisma.cashboxMovement.findMany({
      where,
      orderBy: { fecha: 'desc' },
    });

    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

export default router;
