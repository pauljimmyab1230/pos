import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// ==================== VALIDACIONES ====================
const movementSchema = z.object({
  tipo: z.enum(['INGRESO', 'EGRESO']),
  concepto: z.string().min(1, 'El concepto es requerido').max(200),
  monto: z.number().positive('El monto debe ser mayor a 0'),
  categoria: z.string().max(50).optional().nullable(),
  comprobante: z.string().max(50).optional().nullable(),
});

// ==================== RUTAS ====================

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
    const parsed = movementSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const { tipo, concepto, monto, categoria, comprobante } = parsed.data;

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
    const { desde, hasta, page, limit } = req.query;

    const where: any = { businessId: req.businessId };

    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(String(desde));
      if (hasta) where.fecha.lte = new Date(String(hasta) + 'T23:59:59');
    }

    // Paginación
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit)) || 50));
    const skip = (pageNum - 1) * pageSize;

    const [movimientos, total] = await Promise.all([
      prisma.cashboxMovement.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.cashboxMovement.count({ where }),
    ]);

    res.json({
      data: movimientos,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

export default router;
