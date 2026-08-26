import { Router } from 'express';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /api/expenses
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { businessId: req.businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

// POST /api/expenses
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { descripcion, categoria, monto, pagado, metodoPago, fechaPago, proveedor, comprobante } = req.body;

    const expense = await prisma.expense.create({
      data: {
        descripcion,
        categoria,
        monto,
        pagado: pagado !== false,
        metodoPago,
        fechaPago: fechaPago ? new Date(fechaPago) : null,
        proveedor,
        comprobante,
        businessId: req.businessId!,
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar gasto' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { descripcion, categoria, monto, pagado, metodoPago, fechaPago, proveedor, comprobante } = req.body;

    // Verificar que el gasto pertenezca al negocio
    const existingExpense = await prisma.expense.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });
    if (!existingExpense) return res.status(404).json({ error: 'Gasto no encontrado' });

    const expense = await prisma.expense.update({
      where: { id: req.params.id as string },
      data: {
        descripcion,
        categoria,
        monto,
        pagado,
        metodoPago,
        fechaPago: fechaPago ? new Date(fechaPago) : null,
        proveedor,
        comprobante,
      },
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar gasto' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Verificar que el gasto pertenezca al negocio
    const existingExpense = await prisma.expense.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });
    if (!existingExpense) return res.status(404).json({ error: 'Gasto no encontrado' });

    await prisma.expense.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Gasto eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
});

export default router;
