import { Router } from 'express';
import { prisma } from '../../main';
import { authMiddleware, AuthRequest } from '../../shared/middlewares/auth.middleware';

const router = Router();

// GET /api/products
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { search, tipo, sinStock } = req.query;

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

    const products = await prisma.product.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/:id
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

// GET /api/products/barcode/:code
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

// POST /api/products
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      tipo, nombre, codigo, barcode, categoria, marca,
      unidadMedida, precioConIGV, precioSinIGV, costo,
      stock, stockMinimo, categoriaSunat, catalogoVirtual, imagen,
    } = req.body;

    const product = await prisma.product.create({
      data: {
        tipo: tipo || 'Producto',
        nombre,
        codigo,
        barcode,
        categoria,
        marca,
        unidadMedida: unidadMedida || 'UNI',
        precioConIGV,
        precioSinIGV,
        costo,
        stock: stock || 0,
        stockMinimo: stockMinimo || 0,
        categoriaSunat: categoriaSunat || 'Gravada',
        catalogoVirtual: catalogoVirtual || false,
        imagen,
        businessId: req.businessId!,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      tipo, nombre, codigo, barcode, categoria, marca,
      unidadMedida, precioConIGV, precioSinIGV, costo,
      stock, stockMinimo, categoriaSunat, catalogoVirtual, imagen, activo,
    } = req.body;

    // Verificar que el producto pertenezca al negocio
    const existingProduct = await prisma.product.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });
    if (!existingProduct) return res.status(404).json({ error: 'Producto no encontrado' });

    const product = await prisma.product.update({
      where: { id: req.params.id as string },
      data: {
        tipo,
        nombre,
        codigo,
        barcode,
        categoria,
        marca,
        unidadMedida,
        precioConIGV,
        precioSinIGV,
        costo,
        stock,
        stockMinimo,
        categoriaSunat,
        catalogoVirtual,
        imagen,
        activo,
      },
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Verificar que el producto pertenezca al negocio
    const existingProduct = await prisma.product.findFirst({
      where: { id: req.params.id as string, businessId: req.businessId },
    });
    if (!existingProduct) return res.status(404).json({ error: 'Producto no encontrado' });

    await prisma.product.update({
      where: { id: req.params.id as string },
      data: { activo: false },
    });
    res.json({ message: 'Producto desactivado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

export default router;
