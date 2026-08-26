import { Router } from 'express';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

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
    const {
      destinatarioTipoDoc, destinatarioNumDoc, destinatarioNombres,
      origenRegion, origenProvincia, origenDistrito, origenDireccion,
      destinoRegion, destinoProvincia, destinoDistrito, destinoDireccion,
      motivoEnvio, descripcionMotivo, fechaEnvio, cantidadBultos,
      pesoTotal, unidadPeso, tipoTransporte, conductorTipoDoc,
      conductorNumDoc, conductorNombres, conductorLicencia,
      vehiculoPlaca, observacion, items,
    } = req.body;

    const serieRecord = await prisma.series.findFirst({
      where: { tipo: 'GUIA', businessId: req.businessId },
    });

    if (!serieRecord) return res.status(400).json({ error: 'Serie no encontrada' });

    const nuevoCorrelativo = serieRecord.numeroActual + 1;

    const guide = await prisma.guide.create({
      data: {
        serie: serieRecord.prefijo,
        correlativo: nuevoCorrelativo,
        destinatarioTipoDoc,
        destinatarioNumDoc,
        destinatarioNombres,
        origenRegion,
        origenProvincia,
        origenDistrito,
        origenDireccion,
        destinoRegion,
        destinoProvincia,
        destinoDistrito,
        destinoDireccion,
        motivoEnvio,
        descripcionMotivo,
        fechaEnvio: fechaEnvio ? new Date(fechaEnvio) : null,
        cantidadBultos,
        pesoTotal,
        unidadPeso,
        tipoTransporte,
        conductorTipoDoc,
        conductorNumDoc,
        conductorNombres,
        conductorLicencia,
        vehiculoPlaca,
        observacion,
        businessId: req.businessId!,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            cantidad: item.cantidad,
          })),
        },
      },
      include: { items: true },
    });

    await prisma.series.update({
      where: { id: serieRecord.id },
      data: { numeroActual: nuevoCorrelativo },
    });

    res.status(201).json(guide);
  } catch (error) {
    console.error('Error al crear guía:', error);
    res.status(500).json({ error: 'Error al crear guía' });
  }
});

export default router;
