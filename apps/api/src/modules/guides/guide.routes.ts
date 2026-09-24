import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// ==================== VALIDACIONES ====================
const guideItemSchema = z.object({
  productId: z.string().min(1, 'ID de producto requerido'),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
});

const guideSchema = z.object({
  destinatarioTipoDoc: z.string().max(10).optional().nullable(),
  destinatarioNumDoc: z.string().max(20).optional().nullable(),
  destinatarioNombres: z.string().max(100).optional().nullable(),
  origenRegion: z.string().max(50).optional().nullable(),
  origenProvincia: z.string().max(50).optional().nullable(),
  origenDistrito: z.string().max(50).optional().nullable(),
  origenDireccion: z.string().max(200).optional().nullable(),
  destinoRegion: z.string().max(50).optional().nullable(),
  destinoProvincia: z.string().max(50).optional().nullable(),
  destinoDistrito: z.string().max(50).optional().nullable(),
  destinoDireccion: z.string().max(200).optional().nullable(),
  motivoEnvio: z.string().max(100).optional().nullable(),
  descripcionMotivo: z.string().max(200).optional().nullable(),
  fechaEnvio: z.string().optional().nullable(),
  cantidadBultos: z.number().int().positive().optional().nullable(),
  pesoTotal: z.number().positive().optional().nullable(),
  unidadPeso: z.string().max(10).optional().nullable(),
  tipoTransporte: z.string().max(20).optional().nullable(),
  conductorTipoDoc: z.string().max(10).optional().nullable(),
  conductorNumDoc: z.string().max(20).optional().nullable(),
  conductorNombres: z.string().max(100).optional().nullable(),
  conductorLicencia: z.string().max(20).optional().nullable(),
  vehiculoPlaca: z.string().max(10).optional().nullable(),
  observacion: z.string().max(200).optional().nullable(),
  items: z.array(guideItemSchema).min(1, 'Debe agregar al menos un producto'),
});

// ==================== RUTAS ====================

// GET /api/guides
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const guides = await prisma.guide.findMany({
      where: { businessId: req.businessId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(guides);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener guías' });
  }
});

// GET /api/guides/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const guide = await prisma.guide.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
      include: { items: { include: { product: true } } },
    });
    if (!guide) return res.status(404).json({ error: 'Guía no encontrada' });
    res.json(guide);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener guía' });
  }
});

// POST /api/guides
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = guideSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const { items, fechaEnvio, ...guideData } = parsed.data;

    const serieRecord = await prisma.series.findFirst({
      where: { tipo: 'GUIA', businessId: req.businessId },
    });

    if (!serieRecord) return res.status(400).json({ error: 'Serie no encontrada' });

    const nuevoCorrelativo = serieRecord.numeroActual + 1;

    // Usar transacción para garantizar atomicidad
    const guide = await prisma.$transaction(async (tx) => {
      const newGuide = await tx.guide.create({
        data: {
          ...guideData,
          serie: serieRecord.prefijo,
          correlativo: nuevoCorrelativo,
          fechaEnvio: fechaEnvio ? new Date(fechaEnvio) : null,
          businessId: req.businessId!,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              cantidad: item.cantidad,
            })),
          },
        },
        include: { items: true },
      });

      await tx.series.update({
        where: { id: serieRecord.id },
        data: { numeroActual: nuevoCorrelativo },
      });

      return newGuide;
    });

    res.status(201).json(guide);
  } catch (error) {
    console.error('Error al crear guía:', error);
    res.status(500).json({ error: 'Error al crear guía' });
  }
});

export default router;
