import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plus, Search, Edit2, Trash2, Package, Camera, Barcode, Wrench, Grid, List, AlertTriangle, Clock, XCircle, Check, ChevronLeft, ChevronRight, Store } from 'lucide-react';

interface Product {
  id: string;
  tipo: string;
  nombre: string;
  codigo?: string;
  barcode?: string;
  categoria?: string;
  marca?: string;
  unidadMedida: string;
  precioConIGV: number;
  precioSinIGV: number;
  costo?: number;
  stock: number;
  stockMinimo: number;
  categoriaSunat: string;
  catalogoVirtual: boolean;
  imagen?: string;
  activo: boolean;
  moneda?: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTabs, setActiveTabs] = useState<string[]>(() => {
    const saved = localStorage.getItem('products-active-tabs');
    return saved ? JSON.parse(saved) : ['Productos', 'Servicios'];
  });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('products-view-mode') as 'list' | 'grid') || 'list';
  });
  const [showInventoryFilter, setShowInventoryFilter] = useState(false);
  const [inventoryFilters, setInventoryFilters] = useState(() => {
    const saved = localStorage.getItem('products-inventory-filters');
    return saved ? JSON.parse(saved) : { agotados: false, bajoStock: false, porReponer: false };
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [form, setForm] = useState({
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
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type }]);
    setTimeout(() => {
      setToasts(toasts.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts() as Product[];
      setProducts(data);
    } catch (error) {
      console.error(error);
      showToast('Error al cargar productos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) => {
      const matchesType = 
        (activeTabs.includes('Productos') && p.tipo === 'Producto') ||
        (activeTabs.includes('Servicios') && p.tipo === 'Servicio');
      
      const matchesSearch = 
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(search.toLowerCase());

      let matchesInventory = true;
      if (inventoryFilters.agotados || inventoryFilters.bajoStock || inventoryFilters.porReponer) {
        matchesInventory = false;
        if (inventoryFilters.agotados && p.stock === 0) matchesInventory = true;
        if (inventoryFilters.bajoStock && p.stock > 0 && p.stock <= (p.stockMinimo || 0)) matchesInventory = true;
        if (inventoryFilters.porReponer && p.stock > 0 && p.stock <= 5) matchesInventory = true;
      }
      
      return matchesType && matchesSearch && matchesInventory;
    }
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación de campos obligatorios
    if (!form.nombre.trim()) {
      showToast('El nombre del producto es obligatorio', 'error');
      return;
    }
    if (!form.precioConIGV || parseFloat(form.precioConIGV) <= 0) {
      showToast('El precio con IGV es obligatorio', 'error');
      return;
    }
    if (!form.precioSinIGV || parseFloat(form.precioSinIGV) <= 0) {
      showToast('El precio sin IGV es obligatorio', 'error');
      return;
    }
    
    try {
      const payload = {
        ...form,
        precioConIGV: parseFloat(form.precioConIGV),
        precioSinIGV: parseFloat(form.precioSinIGV),
        costo: form.costo ? parseFloat(form.costo) : null,
        stock: parseInt(form.stock) || 0,
        stockMinimo: 0,
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        showToast('Producto actualizado correctamente', 'success');
      } else {
        await api.createProduct(payload);
        showToast('Producto creado correctamente', 'success');
      }

      setShowForm(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error(error);
      showToast('Error al guardar el producto', 'error');
    }
  };

  const handleEdit = (product: Product) => {
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
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.deleteProduct(id);
      showToast('Producto eliminado correctamente', 'success');
      loadProducts();
    } catch (error) {
      console.error(error);
      showToast('Error al eliminar el producto', 'error');
    }
  };

  const handleToggleCatalogo = async (product: Product) => {
    try {
      await api.updateProduct(product.id, {
        catalogoVirtual: !product.catalogoVirtual
      });
      showToast(
        product.catalogoVirtual 
          ? 'Producto removido del catálogo' 
          : 'Producto agregado al catálogo virtual',
        'success'
      );
      loadProducts();
    } catch (error) {
      showToast('Error al actualizar catálogo', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      tipo: activeTabs.includes('Servicios') && !activeTabs.includes('Productos') ? 'Servicio' : 'Producto',
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
    });
  };

  const calcularPrecioSinIGV = (precioConIGV: string) => {
    const precio = parseFloat(precioConIGV) || 0;
    const sinIGV = precio / 1.18;
    setForm({ ...form, precioConIGV, precioSinIGV: sinIGV.toFixed(2) });
  };

  // Calcular parámetros de inventario
  const totalAgotados = products.filter(p => p.stock === 0).length;
  const totalBajoStock = products.filter(p => p.stock > 0 && p.stock <= (p.stockMinimo || 0)).length;
  const totalPorReponer = products.filter(p => p.stock > 0 && p.stock <= 5).length;

  return (
    <div className="space-y-4">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Lista de productos</h1>
        <button
          onClick={() => {
            const newMode = viewMode === 'list' ? 'grid' : 'list';
            setViewMode(newMode);
            localStorage.setItem('products-view-mode', newMode);
          }}
          className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
        >
          {viewMode === 'list' ? (
            <Grid className="w-5 h-5" />
          ) : (
            <List className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          placeholder="Buscar productos"
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600">
          <Barcode className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            let newTabs;
            if (activeTabs.includes('Productos')) {
              newTabs = activeTabs.filter(t => t !== 'Productos');
            } else {
              newTabs = [...activeTabs, 'Productos'];
            }
            setActiveTabs(newTabs);
            localStorage.setItem('products-active-tabs', JSON.stringify(newTabs));
            setCurrentPage(1);
          }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            activeTabs.includes('Productos')
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Productos
        </button>
        <button
          onClick={() => {
            let newTabs;
            if (activeTabs.includes('Servicios')) {
              newTabs = activeTabs.filter(t => t !== 'Servicios');
            } else {
              newTabs = [...activeTabs, 'Servicios'];
            }
            setActiveTabs(newTabs);
            localStorage.setItem('products-active-tabs', JSON.stringify(newTabs));
            setCurrentPage(1);
          }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            activeTabs.includes('Servicios')
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Servicios
        </button>
        <div className="flex-1"></div>
        <button
          onClick={() => setShowInventoryFilter(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Package className="w-4 h-4" />
          <span className="text-sm font-medium">Inventario</span>
        </button>
      </div>

      {/* Products List */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron {activeTabs.length === 2 ? 'productos ni servicios' : activeTabs.includes('Productos') ? 'productos' : 'servicios'}
            </div>
          ) : (
            paginatedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      product.tipo === 'Servicio'
                        ? 'bg-blue-50'
                        : 'bg-primary-50'
                    }`}
                  >
                    {product.tipo === 'Servicio' ? (
                      <Wrench className="w-7 h-7 text-blue-500" />
                    ) : (
                      <Package className="w-7 h-7 text-primary-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 uppercase">
                      {product.nombre}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Package className="w-4 h-4" />
                        <span>{product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Status */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-primary-500">
                      S/ {Number(product.precioConIGV).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {product.categoriaSunat}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleCatalogo(product)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        product.catalogoVirtual
                          ? 'text-green-500 bg-green-50 hover:bg-green-100'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                      title={product.catalogoVirtual ? 'Quitar del catálogo' : 'Agregar al catálogo'}
                    >
                      <Store className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {loading ? (
            <div className="col-span-2 text-center py-8 text-gray-500">Cargando...</div>
          ) : paginatedProducts.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No se encontraron {activeTabs.length === 2 ? 'productos ni servicios' : activeTabs.includes('Productos') ? 'productos' : 'servicios'}
            </div>
          ) : (
            paginatedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Header with gradient */}
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
                      <img src={product.imagen} alt={product.nombre} className="w-16 h-16 object-cover rounded-lg" />
                    ) : (
                      <>
                        {product.tipo === 'Servicio' ? (
                          <Wrench className="w-12 h-12 text-white mb-2" />
                        ) : (
                          <Package className="w-12 h-12 text-white mb-2" />
                        )}
                      </>
                    )}
                    <span className="text-white text-sm font-medium">
                      {product.tipo}
                    </span>
                  </div>
                </div>

                {/* Content */}
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
                  {/* Actions */}
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleToggleCatalogo(product)}
                      className={`p-2 rounded-lg transition-colors ${
                        product.catalogoVirtual
                          ? 'text-green-500 bg-green-50 hover:bg-green-100'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                      title={product.catalogoVirtual ? 'Quitar del catálogo' : 'Agregar al catálogo'}
                    >
                      <Store className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium ${
                  currentPage === page
                    ? 'bg-primary-500 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => {
          resetForm();
          setEditingProduct(null);
          setShowForm(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Inventory Filter Modal */}
      {showInventoryFilter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center p-4">
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
              {/* Parámetros de control */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-900 mb-3">Parámetros de control</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-600">Stock mínimo permitido:</span>
                    </div>
                    <span className="text-sm font-medium text-orange-500">
                      {products.length > 0 ? Math.round(products.reduce((acc, p) => acc + (p.stockMinimo || 0), 0) / products.length) : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-600">Punto de reorden:</span>
                    </div>
                    <span className="text-sm font-medium text-orange-500">5</span>
                  </div>
                </div>
              </div>

              {/* Filtros de stock */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600">
                    Selecciona los estados de stock que deseas mostrar.
                  </p>
                  <button
                    onClick={() => {
                      const allSelected = inventoryFilters.agotados && inventoryFilters.bajoStock && inventoryFilters.porReponer;
                      const newFilters = {
                        agotados: !allSelected,
                        bajoStock: !allSelected,
                        porReponer: !allSelected,
                      };
                      setInventoryFilters(newFilters);
                      localStorage.setItem('products-inventory-filters', JSON.stringify(newFilters));
                    }}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <Grid className="w-4 h-4" />
                    Seleccionar todo
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Agotados */}
                  <button
                    onClick={() => {
                      const newFilters = { ...inventoryFilters, agotados: !inventoryFilters.agotados };
                      setInventoryFilters(newFilters);
                      localStorage.setItem('products-inventory-filters', JSON.stringify(newFilters));
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      inventoryFilters.agotados
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Agotados</p>
                      <p className="text-sm text-gray-500">Sin unidades disponibles</p>
                    </div>
                    <span className="text-sm font-medium text-gray-600">{totalAgotados}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      inventoryFilters.agotados
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {inventoryFilters.agotados && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </button>

                  {/* Bajo stock */}
                  <button
                    onClick={() => {
                      const newFilters = { ...inventoryFilters, bajoStock: !inventoryFilters.bajoStock };
                      setInventoryFilters(newFilters);
                      localStorage.setItem('products-inventory-filters', JSON.stringify(newFilters));
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      inventoryFilters.bajoStock
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Bajo stock</p>
                      <p className="text-sm text-gray-500">Debajo del mínimo permitido</p>
                    </div>
                    <span className="text-sm font-medium text-gray-600">{totalBajoStock}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      inventoryFilters.bajoStock
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {inventoryFilters.bajoStock && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </button>

                  {/* Por reponer */}
                  <button
                    onClick={() => {
                      const newFilters = { ...inventoryFilters, porReponer: !inventoryFilters.porReponer };
                      setInventoryFilters(newFilters);
                      localStorage.setItem('products-inventory-filters', JSON.stringify(newFilters));
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      inventoryFilters.porReponer
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">Por reponer</p>
                      <p className="text-sm text-gray-500">Próximos a agotarse (antes del punto de reorden)</p>
                    </div>
                    <span className="text-sm font-medium text-gray-600">{totalPorReponer}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      inventoryFilters.porReponer
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {inventoryFilters.porReponer && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  const newFilters = { agotados: false, bajoStock: false, porReponer: false };
                  setInventoryFilters(newFilters);
                  localStorage.setItem('products-inventory-filters', JSON.stringify(newFilters));
                  setShowInventoryFilter(false);
                }}
                className="flex-1 py-3 text-primary-500 font-medium hover:bg-primary-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowInventoryFilter(false)}
                className="flex-1 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form - Estilo Kallpa */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {editingProduct ? 'Editar producto' : 'Nuevo producto'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Información principal */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900">Información principal</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producto / Servicio <span className="text-red-500">*</span></label>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm({ ...form, tipo: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Ingresar nombre del producto"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                    <select
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marca <span className="text-red-500">*</span></label>
                    <select
                      value={form.marca}
                      onChange={(e) => setForm({ ...form, marca: e.target.value })}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda <span className="text-red-500">*</span></label>
                    <select
                      value={form.moneda}
                      onChange={(e) => setForm({ ...form, moneda: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      required
                    >
                      <option value="PEN">S/ PEN</option>
                      <option value="USD">$ USD</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.codigo}
                        onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="Ingresar código"
                      />
                      <button
                        type="button"
                        className="px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Escanear código de barras"
                      >
                        <Barcode className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuración SUNAT */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900">Configuración SUNAT</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría SUNAT <span className="text-red-500">*</span></label>
                    <select
                      value={form.categoriaSunat}
                      onChange={(e) => setForm({ ...form, categoriaSunat: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      required
                    >
                      <option value="Gravada">Gravada</option>
                      <option value="Exonerada">Exonerada</option>
                      <option value="Inafecta">Inafecta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida <span className="text-red-500">*</span></label>
                    <select
                      value={form.unidadMedida}
                      onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })}
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
              </div>

              {/* Precios y costos */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900">Precios y costos</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio con IGV <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.precioConIGV}
                      onChange={(e) => calcularPrecioSinIGV(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Ingresar precio"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio sin IGV <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.precioSinIGV}
                      onChange={(e) => setForm({ ...form, precioSinIGV: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Ingresar precio"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo del producto</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.costo}
                      onChange={(e) => setForm({ ...form, costo: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Ingresar costo"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-xs">i</span>
                        Este es el costo real del producto. Se usa en los reportes de gastos y ganancias.
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inventario <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Ingresar inventario"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Catálogo virtual */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Catálogo virtual</h4>
                      <p className="text-sm text-gray-500">Activa para mostrar este producto en tu catálogo público digital.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.catalogoVirtual}
                      onChange={(e) => setForm({ ...form, catalogoVirtual: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              </div>

              {/* Imagen del producto */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900">Imagen del producto</h3>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer">
                  <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">Tocar para subir o tomar foto</p>
                  <p className="text-sm text-gray-400 mt-1">Imágenes no mayores a 5MB</p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingProduct(null); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
                >
                  {editingProduct ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
