import { Router } from 'express';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /api/settings/series
router.get('/series', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const series = await prisma.series.findMany({
      where: { businessId: req.businessId },
      orderBy: { tipo: 'asc' },
    });
    res.json(series);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener series' });
  }
});

// PUT /api/settings/series
router.put('/series', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { series } = req.body;

    for (const s of series) {
      await prisma.series.update({
        where: { id: s.id },
        data: { prefijo: s.prefijo },
      });
    }

    res.json({ message: 'Series actualizadas' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar series' });
  }
});

// GET /api/settings/banks
router.get('/banks', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const banks = await prisma.bankAccount.findMany({
      where: { businessId: req.businessId },
    });
    res.json(banks);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cuentas bancarias' });
  }
});

// POST /api/settings/banks
router.post('/banks', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { banco, tipoCuenta, moneda, numeroCuenta, cci, visiblePDF } = req.body;

    const bank = await prisma.bankAccount.create({
      data: {
        banco,
        tipoCuenta,
        moneda: moneda || 'PEN',
        numeroCuenta,
        cci,
        visiblePDF: visiblePDF !== false,
        businessId: req.businessId!,
      },
    });

    res.status(201).json(bank);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cuenta bancaria' });
  }
});

// PUT /api/settings/banks/:id
router.put('/banks/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { banco, tipoCuenta, moneda, numeroCuenta, cci, visiblePDF } = req.body;

    const bank = await prisma.bankAccount.update({
      where: { id: req.params.id as string },
      data: { banco, tipoCuenta, moneda, numeroCuenta, cci, visiblePDF },
    });

    res.json(bank);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cuenta bancaria' });
  }
});

// DELETE /api/settings/banks/:id
router.delete('/banks/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.bankAccount.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Cuenta bancaria eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cuenta bancaria' });
  }
});

export default router;
