import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// ==================== VALIDACIONES ====================
const productSchema = z.object({
  tipo: z.enum(['Producto', 'Servicio']).default('Producto'),
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  codigo: z.string().max(50).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  categoria: z.string().max(50).optional().nullable(),
  marca: z.string().max(50).optional().nullable(),
  moneda: z.enum(['PEN', 'USD']).default('PEN'),
  unidadMedida: z.string().max(10).default('NIU'),
  precioConIGV: z.number().positive('El precio con IGV debe ser mayor a 0'),
  precioSinIGV: z.number().positive('El precio sin IGV debe ser mayor a 0'),
  costo: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0, 'El stock no puede ser negativo').default(0),
  stockMinimo: z.number().int().min(0).default(0),
  categoriaSunat: z.enum(['Gravada', 'Exonerada', 'Inafecta']).default('Gravada'),
  catalogoVirtual: z.boolean().default(false),
  imagen: z.string().url('Debe ser una URL válida').optional().nullable(),
});

const productUpdateSchema = productSchema.partial();

// ==================== RUTAS ====================

// GET /api/products - Listar productos con paginación
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { search, tipo, sinStock, page, limit } = req.query;

    const where: any = { businessId: req.businessId, activo: true, temporal: false };

    if (search) {
      where.OR = [
        { nombre: { contains: String(search), mode: 'insensitive' } },
        { codigo: { contains: String(search), mode: 'insensitive' } },
        { barcode: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (sinStock === 'true') {
      where.stock = 0;
    }

    // Paginación
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit)) || 50));
    const skip = (pageNum - 1) * pageSize;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/barcode/:code - Buscar por código de barras
// DEBE IR ANTES de /:id para evitar conflictos de ruta
router.get('/barcode/:code', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { barcode: req.params.code as string, businessId: req.businessId, activo: true },
    });
    res.json(product || null);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar producto' });
  }
});

// GET /api/products/:id - Obtener producto por ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/products - Crear producto
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const data = parsed.data;

    const product = await prisma.product.create({
      data: {
        tipo: data.tipo,
        nombre: data.nombre,
        codigo: data.codigo,
        barcode: data.barcode,
        categoria: data.categoria,
        marca: data.marca,
        moneda: data.moneda,
        unidadMedida: data.unidadMedida,
        precioConIGV: data.precioConIGV,
        precioSinIGV: data.precioSinIGV,
        costo: data.costo,
        stock: data.stock,
        stockMinimo: data.stockMinimo,
        categoriaSunat: data.categoriaSunat,
        catalogoVirtual: data.catalogoVirtual,
        imagen: data.imagen,
        businessId: req.businessId!,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/products/:id - Actualizar producto
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = productUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    // Verificar que el producto pertenezca al negocio
    const existingProduct = await prisma.product.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });
    if (!existingProduct) return res.status(404).json({ error: 'Producto no encontrado' });

    const data = parsed.data;

    const product = await prisma.product.update({
      where: { id: req.params.id as string },
      data: {
        tipo: data.tipo,
        nombre: data.nombre,
        codigo: data.codigo,
        barcode: data.barcode,
        categoria: data.categoria,
        marca: data.marca,
        moneda: data.moneda,
        unidadMedida: data.unidadMedida,
        precioConIGV: data.precioConIGV,
        precioSinIGV: data.precioSinIGV,
        costo: data.costo,
        stock: data.stock,
        stockMinimo: data.stockMinimo,
        categoriaSunat: data.categoriaSunat,
        catalogoVirtual: data.catalogoVirtual,
        imagen: data.imagen,
      },
    });

    res.json(product);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE /api/products/:id - Eliminar producto (soft delete)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Verificar que el producto pertenezca al negocio
    const existingProduct = await prisma.product.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });
    if (!existingProduct) return res.status(404).json({ error: 'Producto no encontrado' });

    // Verificar si tiene dependencias antes de eliminar
    const hasDependencies = await prisma.saleItem.findFirst({
      where: { productId: req.params.id as string },
    });

    if (hasDependencies) {
      return res.status(400).json({ 
        error: 'No se puede eliminar este producto porque tiene ventas asociadas. Solo puede desactivarlo.' 
      });
    }

    await prisma.product.update({
      where: { id: req.params.id as string },
      data: { activo: false },
    });
    res.json({ message: 'Producto desactivado correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

export default router;
