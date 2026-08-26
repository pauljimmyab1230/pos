import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Search, Grid, List, Package, Wrench } from 'lucide-react';
import Modal from '../components/Modal';
import SaleDocumentForm from '../components/SaleDocumentForm';

interface Product {
  id: string;
  tipo: string;
  nombre: string;
  precioConIGV: number;
  stock: number;
  barcode?: string;
}

interface CartItem {
  product: Product;
  cantidad: number;
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string[]>(['Productos', 'Servicios']);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('pos-view-mode') as 'list' | 'grid') || 'list';
  });
  const [showSaleForm, setShowSaleForm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getProducts() as Product[];
        setProducts(data);
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      ((activeTab.includes('Productos') && p.tipo === 'Producto') ||
       (activeTab.includes('Servicios') && p.tipo === 'Servicio')) &&
      (p.nombre.toLowerCase().includes(search.toLowerCase()) ||
       p.barcode?.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
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
    } catch (error) {
      console.error(error);
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
            className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"
          >
            {viewMode === 'list' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          placeholder="Buscar productos"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => {
            if (activeTab.includes('Productos')) {
              setActiveTab(activeTab.filter(t => t !== 'Productos'));
            } else {
              setActiveTab([...activeTab, 'Productos']);
            }
          }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            activeTab.includes('Productos')
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Productos
        </button>
        <button
          onClick={() => {
            if (activeTab.includes('Servicios')) {
              setActiveTab(activeTab.filter(t => t !== 'Servicios'));
            } else {
              setActiveTab([...activeTab, 'Servicios']);
            }
          }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
            activeTab.includes('Servicios')
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Servicios
        </button>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find(item => item.product.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    inCart
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      product.tipo === 'Servicio' ? 'bg-blue-50' : 'bg-primary-50'
                    }`}>
                      {product.tipo === 'Servicio' ? (
                        <Wrench className="w-6 h-6 text-blue-500" />
                      ) : (
                        <Package className="w-6 h-6 text-primary-500" />
                      )}
                    </div>
                    {inCart && (
                      <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {inCart.cantidad}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 mt-2 truncate">{product.nombre}</p>
                  <p className="text-lg font-bold text-primary-500">S/ {Number(product.precioConIGV).toFixed(2)}</p>
                  <p className={`text-xs ${product.stock <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find(item => item.product.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`w-full flex items-center gap-4 p-4 border-2 rounded-xl text-left transition-all ${
                    inCart
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-primary-300'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    product.tipo === 'Servicio' ? 'bg-blue-50' : 'bg-primary-50'
                  }`}>
                    {product.tipo === 'Servicio' ? (
                      <Wrench className="w-7 h-7 text-blue-500" />
                    ) : (
                      <Package className="w-7 h-7 text-primary-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 uppercase">{product.nombre}</h3>
                    <span className={`text-sm ${product.stock > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                      {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-500">S/ {Number(product.precioConIGV).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{product.tipo === 'Servicio' ? 'Servicio' : 'Gravada'}</p>
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
      <div className="bg-white border-t border-gray-200 p-4 mt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">S/ {total.toFixed(2)}</p>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-14 h-14 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Modal Formulario de Venta */}
      <Modal isOpen={showSaleForm} onClose={() => setShowSaleForm(false)} title="Nueva Nota de Venta">
        <SaleDocumentForm
          tipo="NOTA_VENTA"
          initialCart={cart}
          onSave={handleSaveSale}
        />
      </Modal>
    </div>
  );
}
