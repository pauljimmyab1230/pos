import { useEffect, useState } from 'react';
import { useProductsStore } from '../stores/products.store';
import { useToastStore } from '../stores/toast.store';
import { ListSkeleton } from '../components/Skeleton';
import { Search, Grid, List, Package, Wrench } from 'lucide-react';
import Modal from '../components/Modal';
import SaleDocumentForm from '../components/SaleDocumentForm';
import { api } from '../services/api';
import { Product, CartItem } from '../../../packages/shared/types';

export default function SalesPage() {
  const { products, loading, loadProducts } = useProductsStore();
  const showToast = useToastStore((s) => s.showToast);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string[]>(['Productos', 'Servicios']);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('pos-view-mode') as 'list' | 'grid') || 'list';
  });
  const [showSaleForm, setShowSaleForm] = useState(false);

  useEffect(() => {
    loadProducts().catch(() => showToast('Error al cargar productos', 'error'));
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      ((activeTab.includes('Productos') && p.tipo === 'Producto') ||
        (activeTab.includes('Servicios') && p.tipo === 'Servicio')) &&
      (p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    // Validar stock para productos (no servicios)
    if (product.tipo === 'Producto' && product.stock <= 0) {
      showToast('Producto sin stock disponible', 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        // Validar stock al aumentar cantidad
        if (product.tipo === 'Producto' && existing.cantidad >= product.stock) {
          showToast(`Stock máximo disponible: ${product.stock}`, 'error');
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { product, cantidad: 1, precioUnit: Number(product.precioConIGV) }];
    });
  };

  const total = cart.reduce((sum, item) => sum + item.product.precioConIGV * item.cantidad, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowSaleForm(true);
  };

  const handleSaveSale = async (data: any) => {
    try {
      await api.createSale({
        tipo: 'NOTA_VENTA',
        clienteId: data.clienteId || null,
        items: data.items,
        metodoPago: data.metodoPago,
        pagos: data.pagos,
        observacion: data.observacion,
        direccionEnvio: data.direccionEnvio,
        origenCompra: data.origenCompra,
      });
      setCart([]);
      setShowSaleForm(false);
      showToast('Venta registrada exitosamente', 'success');
    } catch (error) {
      showToast('Error al registrar la venta', 'error');
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Venta POS</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const newMode = viewMode === 'list' ? 'grid' : 'list';
              setViewMode(newMode);
              localStorage.setItem('pos-view-mode', newMode);
            }}
            className="p-2 text-primary-500 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg"
          >
            {viewMode === 'list' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          placeholder="Buscar productos"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => {
            if (activeTab.includes('Productos')) {
              setActiveTab(activeTab.filter((t) => t !== 'Productos'));
            } else {
              setActiveTab([...activeTab, 'Productos']);
            }
          }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            activeTab.includes('Productos')
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Productos
        </button>
        <button
          onClick={() => {
            if (activeTab.includes('Servicios')) {
              setActiveTab(activeTab.filter((t) => t !== 'Servicios'));
            } else {
              setActiveTab([...activeTab, 'Servicios']);
            }
          }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            activeTab.includes('Servicios')
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Servicios
        </button>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <ListSkeleton count={5} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    inCart
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        product.tipo === 'Servicio' ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-primary-50 dark:bg-primary-500/10'
                      }`}
                    >
                      {product.tipo === 'Servicio' ? (
                        <Wrench className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                      ) : (
                        <Package className="w-6 h-6 text-primary-500 dark:text-primary-400" />
                      )}
                    </div>
                    {inCart && (
                      <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {inCart.cantidad}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white mt-2 truncate">{product.nombre}</p>
                  <p className="text-lg font-bold text-primary-500 dark:text-primary-400">
                    S/ {Number(product.precioConIGV).toFixed(2)}
                  </p>
                  <p className={`text-xs ${product.stock <= 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`w-full flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-all ${
                    inCart
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      product.tipo === 'Servicio' ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-primary-50 dark:bg-primary-500/10'
                    }`}
                  >
                    {product.tipo === 'Servicio' ? (
                      <Wrench className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                    ) : (
                      <Package className="w-7 h-7 text-primary-500 dark:text-primary-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white uppercase">{product.nombre}</h3>
                    <span className={`text-sm ${product.stock > 0 ? 'text-gray-500 dark:text-gray-400' : 'text-red-500 dark:text-red-400'}`}>
                      {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-500 dark:text-primary-400">
                      S/ {Number(product.precioConIGV).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {product.tipo === 'Servicio' ? 'Servicio' : 'Gravada'}
                    </p>
                  </div>
                  {inCart && (
                    <span className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {inCart.cantidad}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">S/ {total.toFixed(2)}</p>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-14 h-14 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Modal Formulario de Venta */}
      <Modal isOpen={showSaleForm} onClose={() => setShowSaleForm(false)} title="Nueva Nota de Venta">
        <SaleDocumentForm tipo="NOTA_VENTA" initialCart={cart} onSave={handleSaveSale} />
      </Modal>
    </div>
  );
}
