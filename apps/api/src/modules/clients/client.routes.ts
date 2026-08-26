import { Router } from 'express';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /api/clients
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { businessId: req.businessId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/clients/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// GET /api/clients/search/:doc
router.get('/search/:doc', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { numeroDoc: req.params.doc as string, businessId: req.businessId },
    });
    res.json(client || null);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar cliente' });
  }
});

// POST /api/clients
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tipoDoc, numeroDoc, nombres, apellidos, razonSocial, direccion, telefono, email, fechaNacimiento } = req.body;

    const client = await prisma.client.create({
      data: {
        tipoDoc,
        numeroDoc,
        nombres,
        apellidos,
        razonSocial,
        direccion,
        telefono,
        email,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        businessId: req.businessId!,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/clients/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tipoDoc, numeroDoc, nombres, apellidos, razonSocial, direccion, telefono, email, fechaNacimiento } = req.body;

    const client = await prisma.client.update({
      where: { id: req.params.id as string },
      data: {
        tipoDoc,
        numeroDoc,
        nombres,
        apellidos,
        razonSocial,
        direccion,
        telefono,
        email,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
      },
    });

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;
