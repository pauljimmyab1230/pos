import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// ==================== VALIDACIONES ====================
const validateDocument = (tipoDoc: string, numeroDoc: string): string | null => {
  const cleaned = numeroDoc.replace(/\D/g, '');
  switch (tipoDoc) {
    case 'DNI':
      if (cleaned.length !== 8) return 'El DNI debe tener 8 dígitos';
      break;
    case 'RUC':
      if (cleaned.length !== 11) return 'El RUC debe tener 11 dígitos';
      break;
    case 'CE':
      if (cleaned.length < 8 || cleaned.length > 12) return 'El Carnet de Extranjería debe tener entre 8 y 12 caracteres';
      break;
    case 'PTP':
      if (cleaned.length < 8 || cleaned.length > 12) return 'El PTP debe tener entre 8 y 12 caracteres';
      break;
    case 'Pasaporte':
      if (numeroDoc.length < 6 || numeroDoc.length > 15) return 'El Pasaporte debe tener entre 6 y 15 caracteres';
      break;
  }
  return null;
};

const clientSchema = z.object({
  tipoDoc: z.enum(['DNI', 'RUC', 'CE', 'PTP', 'Pasaporte', 'Otro']).default('DNI'),
  numeroDoc: z.string().min(1, 'El número de documento es requerido').max(20),
  nombres: z.string().max(100).optional().nullable(),
  apellidos: z.string().max(100).optional().nullable(),
  razonSocial: z.string().max(200).optional().nullable(),
  direccion: z.string().max(200).optional().nullable(),
  telefono: z.string().max(20).optional().nullable(),
  email: z.string().email('Email inválido').max(100).optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
});

const cleanEmptyStrings = (obj: Record<string, any>) => {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    cleaned[key] = value === '' ? null : value;
  }
  return cleaned;
};

const clientUpdateSchema = clientSchema.partial();

// ==================== RUTAS ====================

// GET /api/clients - Listar clientes con paginación
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { search, page, limit } = req.query;

    const where: Prisma.ClientWhereInput = { businessId: req.businessId! };

    if (search) {
      const searchTerm = String(search);
      where.OR = [
        { nombres: { contains: searchTerm } },
        { apellidos: { contains: searchTerm } },
        { razonSocial: { contains: searchTerm } },
        { numeroDoc: { contains: searchTerm } },
        { telefono: { contains: searchTerm } },
        { email: { contains: searchTerm } },
      ];
    }

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit)) || 50));
    const skip = (pageNum - 1) * pageSize;

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      data: clients,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/clients/search/:doc - Buscar por documento
router.get('/search/:doc', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { numeroDoc: req.params.doc as string, businessId: req.businessId! },
    });
    res.json(client || null);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar cliente' });
  }
});

// GET /api/clients/:id - Obtener cliente por ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId! },
    });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// POST /api/clients - Crear cliente
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const cleanedBody = cleanEmptyStrings(req.body);
    const parsed = clientSchema.safeParse(cleanedBody);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const data = parsed.data;

    // Validar formato de documento
    const docError = validateDocument(data.tipoDoc, data.numeroDoc);
    if (docError) {
      return res.status(400).json({ error: docError });
    }

    // Verificar si ya existe un cliente con el mismo documento
    const existingByDoc = await prisma.client.findFirst({
      where: { numeroDoc: data.numeroDoc, businessId: req.businessId! },
    });
    if (existingByDoc) {
      return res.status(400).json({ error: 'Ya existe un cliente con este número de documento' });
    }

    // Verificar si ya existe un cliente con el mismo email
    if (data.email) {
      const existingByEmail = await prisma.client.findFirst({
        where: { email: data.email, businessId: req.businessId! },
      });
      if (existingByEmail) {
        return res.status(400).json({ error: 'Ya existe un cliente con este correo electrónico' });
      }
    }

    const client = await prisma.client.create({
      data: {
        tipoDoc: data.tipoDoc,
        numeroDoc: data.numeroDoc,
        nombres: data.nombres,
        apellidos: data.apellidos,
        razonSocial: data.razonSocial,
        direccion: data.direccion,
        telefono: data.telefono,
        email: data.email,
        fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
        businessId: req.businessId!,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/clients/:id - Actualizar cliente
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const cleanedBody = cleanEmptyStrings(req.body);
    const parsed = clientUpdateSchema.safeParse(cleanedBody);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const existingClient = await prisma.client.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId! },
    });
    
    if (!existingClient) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const data = parsed.data;

    // Validar formato de documento si se está cambiando
    if (data.tipoDoc || data.numeroDoc) {
      const tipoDoc = data.tipoDoc || existingClient.tipoDoc;
      const numeroDoc = data.numeroDoc || existingClient.numeroDoc;
      const docError = validateDocument(tipoDoc, numeroDoc);
      if (docError) {
        return res.status(400).json({ error: docError });
      }
    }

    // Verificar duplicado si se cambió el número de documento
    if (data.numeroDoc && data.numeroDoc !== existingClient.numeroDoc) {
      const duplicateClient = await prisma.client.findFirst({
        where: { numeroDoc: data.numeroDoc, businessId: req.businessId! },
      });
      if (duplicateClient) {
        return res.status(400).json({ error: 'Ya existe otro cliente con este número de documento' });
      }
    }

    // Verificar duplicado si se cambió el email
    if (data.email && data.email !== existingClient.email) {
      const duplicateEmail = await prisma.client.findFirst({
        where: { email: data.email, businessId: req.businessId! },
      });
      if (duplicateEmail) {
        return res.status(400).json({ error: 'Ya existe otro cliente con este correo electrónico' });
      }
    }

    const client = await prisma.client.update({
      where: { id: req.params.id as string },
      data: {
        tipoDoc: data.tipoDoc,
        numeroDoc: data.numeroDoc,
        nombres: data.nombres,
        apellidos: data.apellidos,
        razonSocial: data.razonSocial,
        direccion: data.direccion,
        telefono: data.telefono,
        email: data.email,
        fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
      },
    });

    res.json(client);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clients/:id - Eliminar cliente
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const existingClient = await prisma.client.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId! },
    });
    
    if (!existingClient) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Verificar si tiene ventas o cotizaciones asociadas
    const [hasSales, hasQuotes] = await Promise.all([
      prisma.sale.findFirst({ where: { clienteId: req.params.id as string } }),
      prisma.quote.findFirst({ where: { clienteId: req.params.id as string } }),
    ]);

    if (hasSales || hasQuotes) {
      const documentos = [];
      if (hasSales) documentos.push('ventas');
      if (hasQuotes) documentos.push('cotizaciones');
      return res.status(400).json({ 
        error: `No se puede eliminar este cliente porque tiene ${documentos.join(' y ')} asociadas` 
      });
    }

    await prisma.client.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

export default router;
