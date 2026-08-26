import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../main';
import { env } from '../../config/env';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, nombre, businessData } = req.body;

    // Validar usuario existente
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Crear negocio
    const business = await prisma.business.create({
      data: {
        ruc: businessData.ruc,
        razonSocial: businessData.razonSocial,
        nombreComercial: businessData.nombreComercial || '',
        direccion: businessData.direccion,
        telefono: businessData.telefono || '',
        email: businessData.email || email,
        igv: businessData.igv || 18,
        giroComercial: businessData.giroComercial || '',
      },
    });

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
        rol: 'Admin',
        businessId: business.id,
      },
    });

    // Crear series por defecto
    const seriesDefaults = [
      { tipo: 'BOLETA', prefijo: 'B001' },
      { tipo: 'FACTURA', prefijo: 'F001' },
      { tipo: 'COTIZACION', prefijo: 'CT01' },
      { tipo: 'NOTA_VENTA', prefijo: 'NV01' },
      { tipo: 'GUIA', prefijo: 'T001' },
    ];

    await prisma.series.createMany({
      data: seriesDefaults.map((s) => ({
        ...s,
        businessId: business.id,
      })),
    });

    // Generar token
    const token = jwt.sign(
      { userId: user.id, businessId: business.id },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
      business: {
        id: business.id,
        ruc: business.ruc,
        razonSocial: business.razonSocial,
        nombreComercial: business.nombreComercial,
      },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { business: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, businessId: user.businessId },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
      business: {
        id: user.business.id,
        ruc: user.business.ruc,
        razonSocial: user.business.razonSocial,
        nombreComercial: user.business.nombreComercial,
        direccion: user.business.direccion,
        logo: user.business.logo,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { business: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
      business: user.business,
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
