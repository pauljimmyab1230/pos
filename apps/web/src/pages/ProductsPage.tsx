import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  useProductsStore,
  Product,
  ProductFormData,
  InventoryFilters,
  REORDER_POINT,
  DEFAULT_PAGE_SIZE,
} from '../stores/products.store';
import { useToastStore } from '../stores/toast.store';
import { ListSkeleton, GridSkeleton } from '../components/Skeleton';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Camera,
  Barcode,
  Wrench,
  Grid,
  List,
  AlertTriangle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';

// ==================== CONSTANTES LOCALES ====================
const INITIAL_FORM: ProductFormData = {
  tipo: 'Producto',
  nombre: '',
  codigo: '',
  barcode: '',
  categoria: '',
  marca: '',
  moneda: 'PEN',
  unidadMedida: 'NIU',
  precioConIGV: '',
  precioSinIGV: '',
  costo: '',
  stock: '0',
  categoriaSunat: 'Gravada',
  catalogoVirtual: false,
  imagen: '',
};

const INITIAL_INVENTORY_FILTERS: InventoryFilters = {
  agotados: false,
  bajoStock: false,
  porReponer: false,
};

// ==================== COMPONENTE PRINCIPAL ====================
export default function ProductsPage() {
  const {
    products,
    loading,
    creating,
    updating,
    deleting,
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getFilteredProducts,
    getInventoryStats,
  } = useProductsStore();

  const showToast = useToastStore((s) => s.showToast);

  // ==================== ESTADO LOCAL ====================
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTabs, setActiveTabs] = useState<string[]>(() => {
    const saved = localStorage.getItem('products-active-tabs');
    return saved ? JSON.parse(saved) : ['Productos', 'Servicios'];
  });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('products-view-mode') as 'list' | 'grid') || 'list';
  });
  const [showInventoryFilter, setShowInventoryFilter] = useState(false);
  const [inventoryFilters, setInventoryFilters] = useState<InventoryFilters>(() => {
    const saved = localStorage.getItem('products-inventory-filters');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY_FILTERS;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<ProductFormData>(INITIAL_FORM);

  // ==================== EFECTOS ====================
  useEffect(() => {
    loadProducts().catch(() => showToast('Error al cargar productos', 'error'));
  }, [loadProducts, showToast]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTabs, inventoryFilters]);

  // ==================== MEMOS ====================
  const filteredProducts = useMemo(
    () =>
      getFilteredProducts({
        activeTabs,
        search,
        inventoryFilters,
      }),
    [getFilteredProducts, activeTabs, search, inventoryFilters]
  );

  const inventoryStats = useMemo(
    () => getInventoryStats(),
    [getInventoryStats, products]
  );

  const totalPages = useMemo(
    () => Math.ceil(filteredProducts.length / DEFAULT_PAGE_SIZE),
    [filteredProducts.length]
  );

  const paginatedProducts = useMemo(
    () =>
      filteredProducts.slice(
        (currentPage - 1) * DEFAULT_PAGE_SIZE,
        currentPage * DEFAULT_PAGE_SIZE
      ),
    [filteredProducts, currentPage]
  );

  const isFormValid = useMemo(() => {
    return (
      form.nombre.trim() !== '' &&
      parseFloat(form.precioConIGV) > 0 &&
      parseFloat(form.precioSinIGV) > 0
    );
  }, [form.nombre, form.precioConIGV, form.precioSinIGV]);

  // ==================== CALLBACKS ====================
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isFormValid) {
        showToast('Completa todos los campos obligatorios', 'error');
        return;
      }

      try {
        const payload: Partial<Product> = {
          tipo: form.tipo,
          nombre: form.nombre.trim(),
          codigo: form.codigo || undefined,
          barcode: form.barcode || undefined,
          categoria: form.categoria || undefined,
          marca: form.marca || undefined,
          moneda: form.moneda,
          unidadMedida: form.unidadMedida,
          precioConIGV: parseFloat(form.precioConIGV),
          precioSinIGV: parseFloat(form.precioSinIGV),
          costo: form.costo ? parseFloat(form.costo) : undefined,
          stock: parseInt(form.stock) || 0,
          stockMinimo: 0,
          categoriaSunat: form.categoriaSunat,
          catalogoVirtual: form.catalogoVirtual,
          imagen: form.imagen || undefined,
        };

        if (editingProduct) {
          await updateProduct(editingProduct.id, payload);
          showToast('Producto actualizado correctamente', 'success');
        } else {
          await createProduct(payload);
          showToast('Producto creado correctamente', 'success');
        }

        setShowForm(false);
        setEditingProduct(null);
        resetForm();
      } catch (error) {
        showToast('Error al guardar el producto', 'error');
      }
    },
    [form, editingProduct, isFormValid, createProduct, updateProduct, showToast]
  );

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setForm({
      tipo: product.tipo,
      nombre: product.nombre,
      codigo: product.codigo || '',
      barcode: product.barcode || '',
      categoria: product.categoria || '',
      marca: product.marca || '',
      moneda: product.moneda || 'PEN',
      unidadMedida: product.unidadMedida,
      precioConIGV: String(product.precioConIGV),
      precioSinIGV: String(product.precioSinIGV),
      costo: product.costo ? String(product.costo) : '',
      stock: String(product.stock),
      categoriaSunat: product.categoriaSunat,
      catalogoVirtual: product.catalogoVirtual,
      imagen: product.imagen || '',
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('¿Eliminar este producto?')) return;
      try {
        await deleteProduct(id);
        showToast('Producto eliminado correctamente', 'success');
      } catch (error) {
        showToast('Error al eliminar el producto', 'error');
      }
    },
    [deleteProduct, showToast]
  );

  const handleToggleCatalogo = useCallback(
    async (product: Product) => {
      try {
        await updateProduct(product.id, {
          catalogoVirtual: !product.catalogoVirtual,
        });
        showToast(
          product.catalogoVirtual
            ? 'Producto removido del catálogo'
            : 'Producto agregado al catálogo virtual',
          'success'
        );
      } catch (error) {
        showToast('Error al actualizar catálogo', 'error');
      }
    },
    [updateProduct, showToast]
  );

  const resetForm = useCallback(() => {
    setForm({
      ...INITIAL_FORM,
      tipo: activeTabs.includes('Servicios') && !activeTabs.includes('Productos')
        ? 'Servicio'
        : 'Producto',
    });
  }, [activeTabs]);

  const calcularPrecioSinIGV = useCallback(
    (precioConIGV: string) => {
      const precio = parseFloat(precioConIGV) || 0;
      const sinIGV = precio / 1.18;
      setForm((prev) => ({ ...prev, precioConIGV, precioSinIGV: sinIGV.toFixed(2) }));
    },
    []
  );

  const handleTabToggle = useCallback((tab: string) => {
    setActiveTabs((prev) => {
      const newTabs = prev.includes(tab)
        ? prev.filter((t) => t !== tab)
        : [...prev, tab];
      localStorage.setItem('products-active-tabs', JSON.stringify(newTabs));
      return newTabs;
    });
  }, []);

  const handleViewModeToggle = useCallback(() => {
    setViewMode((prev) => {
      const newMode = prev === 'list' ? 'grid' : 'list';
      localStorage.setItem('products-view-mode', newMode);
      return newMode;
    });
  }, []);

  const handleInventoryFilterToggle = useCallback((filter: keyof InventoryFilters) => {
    setInventoryFilters((prev) => {
      const newFilters = { ...prev, [filter]: !prev[filter] };
      localStorage.setItem('products-inventory-filters', JSON.stringify(newFilters));
      return newFilters;
    });
  }, []);

  const handleSelectAllFilters = useCallback(() => {
    setInventoryFilters((prev) => {
      const allSelected = prev.agotados && prev.bajoStock && prev.porReponer;
      const newFilters = {
        agotados: !allSelected,
        bajoStock: !allSelected,
        porReponer: !allSelected,
      };
      localStorage.setItem('products-inventory-filters', JSON.stringify(newFilters));
      return newFilters;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setInventoryFilters(INITIAL_INVENTORY_FILTERS);
    localStorage.setItem('products-inventory-filters', JSON.stringify(INITIAL_INVENTORY_FILTERS));
    setShowInventoryFilter(false);
  }, []);

  // ==================== RENDER ====================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Lista de productos</h1>
        <button
          onClick={handleViewModeToggle}
          className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
          aria-label={viewMode === 'list' ? 'Cambiar a vista cuadrícula' : 'Cambiar a vista lista'}
        >
          {viewMode === 'list' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          placeholder="Buscar productos"
          aria-label="Buscar productos por nombre, código o código de barras"
        />
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
          aria-label="Escanear código de barras"
        >
          <Barcode className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2" role="tablist" aria-label="Filtrar por tipo">
        <button
          onClick={() => handleTabToggle('Productos')}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            activeTabs.includes('Productos')
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          role="tab"
          aria-selected={activeTabs.includes('Productos')}
          aria-controls="products-list"
        >
          Productos
        </button>
        <button
          onClick={() => handleTabToggle('Servicios')}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            activeTabs.includes('Servicios')
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          role="tab"
          aria-selected={activeTabs.includes('Servicios')}
          aria-controls="products-list"
        >
          Servicios
        </button>
        <div className="flex-1"></div>
        <button
          onClick={() => setShowInventoryFilter(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 transition-colors"
          aria-label="Abrir filtros de inventario"
        >
          <Package className="w-4 h-4" />
          <span className="text-sm font-medium">Inventario</span>
        </button>
      </div>

      {/* Products List */}
      <div id="products-list" role="tabpanel" aria-label="Lista de productos">
        {loading ? (
          viewMode === 'list' ? <ListSkeleton count={5} /> : <GridSkeleton count={8} />
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {paginatedProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron{' '}
                {activeTabs.length === 2
                  ? 'productos ni servicios'
                  : activeTabs.includes('Productos')
                  ? 'productos'
                  : 'servicios'}
              </div>
            ) : (
              paginatedProducts.map((product) => (
                <ProductListItem
                  key={product.id}
                  product={product}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleCatalogo={handleToggleCatalogo}
                />
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {paginatedProducts.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                No se encontraron productos
              </div>
            ) : (
              paginatedProducts.map((product) => (
                <ProductGridItem
                  key={product.id}
                  product={product}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleCatalogo={handleToggleCatalogo}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredProducts.length}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      )}

      {/* FAB Button */}
      <button
        onClick={() => {
          resetForm();
          setEditingProduct(null);
          setShowForm(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors flex items-center justify-center z-40"
        aria-label="Crear nuevo producto"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Inventory Filter Modal */}
      {showInventoryFilter && (
        <InventoryFilterModal
          filters={inventoryFilters}
          stats={inventoryStats}
          onToggle={handleInventoryFilterToggle}
          onSelectAll={handleSelectAllFilters}
          onClear={handleClearFilters}
          onApply={() => setShowInventoryFilter(false)}
        />
      )}

      {/* Modal Form */}
      {showForm && (
        <ProductFormModal
          form={form}
          editingProduct={editingProduct}
          isCreating={creating}
          isUpdating={updating}
          isFormValid={isFormValid}
          onChange={setForm}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onCalcPrice={calcularPrecioSinIGV}
        />
      )}
    </div>
  );
}

// ==================== SUB-COMPONENTES ====================

// Product List Item
interface ProductListItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleCatalogo: (product: Product) => void;
}

function ProductListItem({ product, onEdit, onDelete, onToggleCatalogo }: ProductListItemProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
            product.tipo === 'Servicio' ? 'bg-blue-50' : 'bg-primary-50'
          }`}
          aria-hidden="true"
        >
          {product.tipo === 'Servicio' ? (
            <Wrench className="w-7 h-7 text-blue-500" />
          ) : (
            <Package className="w-7 h-7 text-primary-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 uppercase">{product.nombre}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Package className="w-4 h-4" aria-hidden="true" />
              <span>{product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}</span>
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-primary-500">
            S/ {Number(product.precioConIGV).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{product.categoriaSunat}</p>
        </div>

        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => onToggleCatalogo(product)}
            className={`p-1.5 rounded-lg transition-colors ${
              product.catalogoVirtual
                ? 'text-green-500 bg-green-50 hover:bg-green-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title={product.catalogoVirtual ? 'Quitar del catálogo' : 'Agregar al catálogo'}
            aria-label={
              product.catalogoVirtual
                ? `Quitar ${product.nombre} del catálogo`
                : `Agregar ${product.nombre} al catálogo`
            }
          >
            <Store className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(product)}
            className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
            aria-label={`Editar ${product.nombre}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label={`Eliminar ${product.nombre}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Product Grid Item
interface ProductGridItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleCatalogo: (product: Product) => void;
}

function ProductGridItem({ product, onEdit, onDelete, onToggleCatalogo }: ProductGridItemProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      <div
        className={`relative p-4 ${
          product.tipo === 'Servicio'
            ? 'bg-gradient-to-br from-blue-400 to-blue-600'
            : 'bg-gradient-to-br from-primary-400 to-primary-600'
        }`}
      >
        <span className="absolute top-2 right-2 px-2 py-1 bg-white/20 text-white text-xs rounded-full">
          {product.categoriaSunat}
        </span>
        {product.catalogoVirtual && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
            Catálogo
          </span>
        )}
        <div className="flex flex-col items-center justify-center py-4">
          {product.imagen ? (
            <img
              src={product.imagen}
              alt={product.nombre}
              className="w-16 h-16 object-cover rounded-lg"
            />
          ) : (
            <>
              {product.tipo === 'Servicio' ? (
                <Wrench className="w-12 h-12 text-white mb-2" aria-hidden="true" />
              ) : (
                <Package className="w-12 h-12 text-white mb-2" aria-hidden="true" />
              )}
            </>
          )}
          <span className="text-white text-sm font-medium">{product.tipo}</span>
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm text-center uppercase line-clamp-2 min-h-[40px]">
          {product.nombre}
        </h3>
        <div className="flex items-center justify-between mt-3">
          <p className="text-primary-500 font-bold">
            S/ {Number(product.precioConIGV).toFixed(2)}
          </p>
          <span className={`text-xs ${product.stock > 0 ? 'text-gray-500' : 'text-red-500'}`}>
            {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => onToggleCatalogo(product)}
            className={`p-2 rounded-lg transition-colors ${
              product.catalogoVirtual
                ? 'text-green-500 bg-green-50 hover:bg-green-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            aria-label={
              product.catalogoVirtual
                ? `Quitar ${product.nombre} del catálogo`
                : `Agregar ${product.nombre} al catálogo`
            }
          >
            <Store className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(product)}
            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
            aria-label={`Editar ${product.nombre}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label={`Eliminar ${product.nombre}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-gray-500">
        Mostrando {startItem} - {endItem} de {totalItems}
      </p>
      <div className="flex items-center gap-2" role="navigation" aria-label="Paginación">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-lg text-sm font-medium ${
              currentPage === page
                ? 'bg-primary-500 text-white'
                : 'border border-gray-300 hover:bg-gray-50'
            }`}
            aria-label={`Página ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Inventory Filter Modal
interface InventoryFilterModalProps {
  filters: InventoryFilters;
  stats: { agotados: number; bajoStock: number; porReponer: number };
  onToggle: (filter: keyof InventoryFilters) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onApply: () => void;
}

function InventoryFilterModal({
  filters,
  stats,
  onToggle,
  onSelectAll,
  onClear,
  onApply,
}: InventoryFilterModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Filtros de inventario"
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-500" />
            </div>
            <h2 className="text-lg font-semibold">Filtros de inventario</h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-3">Parámetros de control</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" aria-hidden="true" />
                  <span className="text-sm text-gray-600">Stock mínimo permitido:</span>
                </div>
                <span className="text-sm font-medium text-orange-500">
                  {stats.agotados + stats.bajoStock + stats.porReponer > 0 ? 'Configurado' : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" aria-hidden="true" />
                  <span className="text-sm text-gray-600">Punto de reorden:</span>
                </div>
                <span className="text-sm font-medium text-orange-500">{REORDER_POINT}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">
                Selecciona los estados de stock que deseas mostrar.
              </p>
              <button
                onClick={onSelectAll}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                aria-label="Seleccionar todos los filtros"
              >
                <Grid className="w-4 h-4" />
                Seleccionar todo
              </button>
            </div>

            <div className="space-y-3">
              <FilterButton
                active={filters.agotados}
                icon={<XCircle className="w-5 h-5 text-red-500" />}
                iconBg="bg-red-50"
                title="Agotados"
                description="Sin unidades disponibles"
                count={stats.agotados}
                onClick={() => onToggle('agotados')}
              />
              <FilterButton
                active={filters.bajoStock}
                icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
                iconBg="bg-orange-50"
                title="Bajo stock"
                description="Debajo del mínimo permitido"
                count={stats.bajoStock}
                onClick={() => onToggle('bajoStock')}
              />
              <FilterButton
                active={filters.porReponer}
                icon={<Clock className="w-5 h-5 text-yellow-500" />}
                iconBg="bg-yellow-50"
                title="Por reponer"
                description="Próximos a agotarse"
                count={stats.porReponer}
                onClick={() => onToggle('porReponer')}
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClear}
            className="flex-1 py-3 text-primary-500 font-medium hover:bg-primary-50 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onApply}
            className="flex-1 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// Filter Button Component
interface FilterButtonProps {
  active: boolean;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  count: number;
  onClick: () => void;
}

function FilterButton({
  active,
  icon,
  iconBg,
  title,
  description,
  count,
  onClick,
}: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors ${
        active
          ? 'border-primary-300 bg-primary-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      aria-pressed={active}
    >
      <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <span className="text-sm font-medium text-gray-600">{count}</span>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          active ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
        }`}
      >
        {active && <div className="w-2 h-2 bg-white rounded-full"></div>}
      </div>
    </button>
  );
}

// Product Form Modal
interface ProductFormModalProps {
  form: ProductFormData;
  editingProduct: Product | null;
  isCreating: boolean;
  isUpdating: boolean;
  isFormValid: boolean;
  onChange: (form: ProductFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onCalcPrice: (price: string) => void;
}

function ProductFormModal({
  form,
  editingProduct,
  isCreating,
  isUpdating,
  isFormValid,
  onChange,
  onSubmit,
  onClose,
  onCalcPrice,
}: ProductFormModalProps) {
  const isSubmitting = isCreating || isUpdating;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editingProduct ? 'Editar producto' : 'Nuevo producto'}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            {editingProduct ? 'Editar producto' : 'Nuevo producto'}
          </h2>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Información principal */}
          <fieldset>
            <legend className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
              <h3 className="font-medium text-gray-900">Información principal</h3>
            </legend>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="product-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Producto / Servicio <span className="text-red-500">*</span>
                </label>
                <select
                  id="product-type"
                  value={form.tipo}
                  onChange={(e) => onChange({ ...form, tipo: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="Producto">Producto</option>
                  <option value="Servicio">Servicio</option>
                </select>
              </div>
              <div></div>
            </div>

            <div className="mt-4">
              <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del producto <span className="text-red-500">*</span>
              </label>
              <input
                id="product-name"
                type="text"
                value={form.nombre}
                onChange={(e) => onChange({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Ingresar nombre del producto"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  id="product-category"
                  value={form.categoria}
                  onChange={(e) => onChange({ ...form, categoria: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  <option value="Ferreteria">Ferretería</option>
                  <option value="Electronica">Electrónica</option>
                  <option value="Ropa">Ropa</option>
                  <option value="Alimentos">Alimentos</option>
                  <option value="Bebidas">Bebidas</option>
                  <option value="Limpieza">Limpieza</option>
                  <option value="Desarrollo Web">Desarrollo Web</option>
                  <option value="Diseño">Diseño</option>
                  <option value="Consultoría">Consultoría</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div>
                <label htmlFor="product-brand" className="block text-sm font-medium text-gray-700 mb-1">
                  Marca <span className="text-red-500">*</span>
                </label>
                <select
                  id="product-brand"
                  value={form.marca}
                  onChange={(e) => onChange({ ...form, marca: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Seleccionar marca</option>
                  <option value="Genérico">Genérico</option>
                  <option value="Samsung">Samsung</option>
                  <option value="Apple">Apple</option>
                  <option value="Otra">Otra</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="product-currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda <span className="text-red-500">*</span>
                </label>
                <select
                  id="product-currency"
                  value={form.moneda}
                  onChange={(e) => onChange({ ...form, moneda: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="PEN">S/ PEN</option>
                  <option value="USD">$ USD</option>
                </select>
              </div>
              <div className="col-span-2">
                <label htmlFor="product-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <div className="flex gap-2">
                  <input
                    id="product-code"
                    type="text"
                    value={form.codigo}
                    onChange={(e) => onChange({ ...form, codigo: e.target.value })}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Ingresar código"
                  />
                  <button
                    type="button"
                    className="px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Escanear código de barras"
                    aria-label="Escanear código de barras"
                  >
                    <Barcode className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Configuración SUNAT */}
          <fieldset>
            <legend className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
              <h3 className="font-medium text-gray-900">Configuración SUNAT</h3>
            </legend>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="product-sunat-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría SUNAT <span className="text-red-500">*</span>
                </label>
                <select
                  id="product-sunat-category"
                  value={form.categoriaSunat}
                  onChange={(e) => onChange({ ...form, categoriaSunat: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="Gravada">Gravada</option>
                  <option value="Exonerada">Exonerada</option>
                  <option value="Inafecta">Inafecta</option>
                </select>
              </div>
              <div>
                <label htmlFor="product-unit" className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad de medida <span className="text-red-500">*</span>
                </label>
                <select
                  id="product-unit"
                  value={form.unidadMedida}
                  onChange={(e) => onChange({ ...form, unidadMedida: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="NIU">NIU (Bienes)</option>
                  <option value="ZZ">ZZ (Unidad)</option>
                  <option value="KGM">KGM (Kilogramo)</option>
                  <option value="LTR">LTR (Litro)</option>
                  <option value="MTR">MTR (Metro)</option>
                  <option value="M2">M2 (Metro cuadrado)</option>
                  <option value="M3">M3 (Metro cúbico)</option>
                  <option value="HRS">HRS (Hora)</option>
                  <option value="DAY">DAY (Día)</option>
                  <option value="BOX">BOX (Caja)</option>
                  <option value="SET">SET (Juego)</option>
                  <option value="PCK">PCK (Paquete)</option>
                  <option value="DZN">DZN (Docena)</option>
                  <option value="PR">PR (Par)</option>
                  <option value="NI">NI (Servicio)</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Precios y costos */}
          <fieldset>
            <legend className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
              <h3 className="font-medium text-gray-900">Precios y costos</h3>
            </legend>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="product-price-igv" className="block text-sm font-medium text-gray-700 mb-1">
                  Precio con IGV <span className="text-red-500">*</span>
                </label>
                <input
                  id="product-price-igv"
                  type="number"
                  step="0.01"
                  value={form.precioConIGV}
                  onChange={(e) => onCalcPrice(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ingresar precio"
                  required
                />
              </div>
              <div>
                <label htmlFor="product-price-no-igv" className="block text-sm font-medium text-gray-700 mb-1">
                  Precio sin IGV <span className="text-red-500">*</span>
                </label>
                <input
                  id="product-price-no-igv"
                  type="number"
                  step="0.01"
                  value={form.precioSinIGV}
                  onChange={(e) => onChange({ ...form, precioSinIGV: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ingresar precio"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="product-cost" className="block text-sm font-medium text-gray-700 mb-1">
                  Costo del producto
                </label>
                <input
                  id="product-cost"
                  type="number"
                  step="0.01"
                  value={form.costo}
                  onChange={(e) => onChange({ ...form, costo: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ingresar costo"
                />
                <p className="text-xs text-gray-500 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                      i
                    </span>
                    Este es el costo real del producto. Se usa en los reportes de gastos y ganancias.
                  </span>
                </p>
              </div>
              <div>
                <label htmlFor="product-stock" className="block text-sm font-medium text-gray-700 mb-1">
                  Inventario <span className="text-red-500">*</span>
                </label>
                <input
                  id="product-stock"
                  type="number"
                  value={form.stock}
                  onChange={(e) => onChange({ ...form, stock: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ingresar inventario"
                  required
                />
              </div>
            </div>
          </fieldset>

          {/* Catálogo virtual */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Catálogo virtual</h4>
                  <p className="text-sm text-gray-500">
                    Activa para mostrar este producto en tu catálogo público digital.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.catalogoVirtual}
                  onChange={(e) => onChange({ ...form, catalogoVirtual: e.target.checked })}
                  className="sr-only peer"
                  aria-label="Activar catálogo virtual"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          </div>

          {/* Imagen del producto */}
          <fieldset>
            <legend className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
              <h3 className="font-medium text-gray-900">Imagen del producto</h3>
            </legend>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer">
              <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" aria-hidden="true" />
              <p className="text-gray-600">Tocar para subir o tomar foto</p>
              <p className="text-sm text-gray-400 mt-1">Imágenes no mayores a 5MB</p>
            </div>
          </fieldset>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? editingProduct
                  ? 'Actualizando...'
                  : 'Guardando...'
                : editingProduct
                ? 'Actualizar'
                : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
