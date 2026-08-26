import { Router } from 'express';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /api/business
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.businessId },
      include: { bankAccounts: true },
    });
    res.json(business);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener negocio' });
  }
});

// PUT /api/business
router.put('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { razonSocial, nombreComercial, direccion, telefono, email, igv, giroComercial } = req.body;

    const business = await prisma.business.update({
      where: { id: req.businessId },
      data: {
        razonSocial,
        nombreComercial,
        direccion,
        telefono,
        email,
        igv,
        giroComercial,
      },
    });

    res.json(business);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar negocio' });
  }
});

export default router;
