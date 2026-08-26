import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /api/users
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { businessId: req.businessId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// GET /api/users/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// POST /api/users
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: rol || 'Vendedor',
        businessId: req.businessId!,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { nombre, rol } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { nombre, rol },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // No permitir eliminar el usuario admin actual
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }

    await prisma.user.delete({
      where: { id: req.params.id as string },
    });
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

export default router;
