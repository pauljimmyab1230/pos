import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Plus, Search, Check, XCircle, ShoppingCart, ScanLine, Camera, Package, CreditCard, ChevronRight, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  tipo: string;
  nombre: string;
  precioConIGV: number;
  stock: number;
  codigo?: string;
  barcode?: string;
}

interface Client {
  id: string;
  tipoDoc: string;
  numeroDoc: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  direccion?: string;
}

interface CartItem {
  product: Product;
  cantidad: number;
  precioUnit: number;
}

interface Payment {
  metodo: string;
  monto: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function NewQuotePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchClient, setSearchClient] = useState('');
  
  const [form, setForm] = useState({
    clienteId: '',
    tipoDoc: 'DNI',
    numeroDoc: '',
    nombres: '',
    apellidos: '',
    razonSocial: '',
    direccion: '',
    metodoPago: 'Efectivo',
    observacion: '',
    direccionEnvio: '',
    origenCompra: 'Tienda Física',
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([{ metodo: 'Efectivo', monto: 0 }]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, clientsData] = await Promise.all([
        api.getProducts() as Promise<Product[]>,
        api.getClients() as Promise<Client[]>
      ]);
      setProducts(productsData);
      setClients(clientsData);
    } catch (error) {
      showToast('Error al cargar datos', 'error');
    }
  };

  const filteredProducts = products.filter(p =>
    p.nombre.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const filteredClients = clients.filter(c =>
    c.nombres?.toLowerCase().includes(searchClient.toLowerCase()) ||
    c.apellidos?.toLowerCase().includes(searchClient.toLowerCase()) ||
    c.razonSocial?.toLowerCase().includes(searchClient.toLowerCase()) ||
    c.numeroDoc?.includes(searchClient)
  );

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, cantidad: 1, precioUnit: product.precioConIGV }]);
    }
    setShowProductModal(false);
    setSearchProduct('');
  };

  const updateQuantity = (productId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product.id === productId ? { ...item, cantidad } : item
      ));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const selectClient = (client: Client) => {
    setForm({
      ...form,
      clienteId: client.id,
      tipoDoc: client.tipoDoc,
      numeroDoc: client.numeroDoc,
      nombres: client.nombres || '',
      apellidos: client.apellidos || '',
      razonSocial: client.razonSocial || '',
      direccion: client.direccion || '',
    });
    setShowClientModal(false);
    setSearchClient('');
  };

  const totalSinIGV = cart.reduce((sum, item) => sum + (Number(item.precioUnit) * item.cantidad), 0);
  const subtotal = totalSinIGV / 1.18;
  const igv = totalSinIGV - subtotal;
  const total = totalSinIGV;

  const handleSubmit = async () => {
    if (cart.length === 0) {
      showToast('Agrega al menos un producto', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.createQuote({
        clienteId: form.clienteId || null,
        items: cart.map(item => ({
          productId: item.product.id,
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
        })),
        metodoPago: form.metodoPago,
        observacion: form.observacion,
        direccionEnvio: form.direccionEnvio,
        origenCompra: form.origenCompra,
      });

      showToast('Cotización creada correctamente', 'success');
      setTimeout(() => navigate('/quotes'), 1500);
    } catch (error) {
      showToast('Error al crear cotización', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {toast.type === 'success' ? <Check className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Nueva Cotización</h1>
        <button className="ml-auto p-2 text-primary-500 hover:bg-primary-50 rounded-lg">
          <span className="w-6 h-6 border-2 border-primary-500 rounded-full flex items-center justify-center text-sm font-bold">i</span>
        </button>
      </div>

      {/* Serie, Fecha, Moneda */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Serie</label>
          <p className="font-medium text-gray-900">CT01</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fecha de emisión</label>
          <p className="font-medium text-gray-900">{new Date().toLocaleDateString('es-PE')}</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Moneda</label>
          <p className="font-medium text-gray-900">PE (Soles)</p>
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
              <span className="text-primary-500 font-semibold">👤</span>
            </div>
            <h3 className="font-medium text-gray-900">Datos del cliente</h3>
          </div>
          <button
            onClick={() => setShowClientModal(true)}
            className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Tipo</label>
            <select
              value={form.tipoDoc}
              onChange={(e) => setForm({ ...form, tipoDoc: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="DNI">DNI</option>
              <option value="RUC">RUC</option>
              <option value="CE">Carnet de extranjería</option>
              <option value="Pasaporte">Pasaporte</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Número de documento</label>
            <input
              type="text"
              value={form.numeroDoc}
              onChange={(e) => setForm({ ...form, numeroDoc: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Número de documento"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">
              {form.tipoDoc === 'RUC' ? 'Razón social' : 'Nombres y apellidos'}
            </label>
            <input
              type="text"
              value={form.tipoDoc === 'RUC' ? form.razonSocial : `${form.nombres} ${form.apellidos}`.trim()}
              onChange={(e) => {
                if (form.tipoDoc === 'RUC') {
                  setForm({ ...form, razonSocial: e.target.value });
                } else {
                  setForm({ ...form, nombres: e.target.value });
                }
              }}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder={form.tipoDoc === 'RUC' ? 'Razón social' : 'Nombres y apellidos'}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Dirección"
            />
          </div>
        </div>
      </div>

      {/* Productos y Servicios */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-500" />
          </div>
          <h3 className="font-medium text-gray-900">Productos y Servicios</h3>
        </div>

        {/* Botones de acción */}
        <div className="space-y-3 mb-4">
          <button
            onClick={() => setShowProductModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            <ScanLine className="w-5 h-5" />
            Escanear con pistola lectora
          </button>
          <button
            onClick={() => setShowProductModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-primary-500 text-primary-500 rounded-xl font-medium hover:bg-primary-50 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Escanear con cámara
          </button>
          <button
            onClick={() => setShowProductModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-primary-500 text-primary-500 rounded-xl font-medium hover:bg-primary-50 transition-colors"
          >
            <Package className="w-5 h-5" />
            Agregar manualmente
          </button>
        </div>

        {/* Producto temporal */}
        <button className="w-full py-3 border-2 border-orange-400 text-orange-500 rounded-xl font-medium hover:bg-orange-50 transition-colors mb-4">
          Añadir producto temporal
        </button>

        {/* Lista de productos en el carrito */}
        {cart.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No hay productos agregados</p>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{item.product.nombre}</p>
                  <p className="text-xs text-gray-500">S/ {item.precioUnit.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.cantidad - 1)}
                    className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.cantidad + 1)}
                    className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
                <p className="font-medium text-gray-900 text-sm">S/ {(item.precioUnit * item.cantidad).toFixed(2)}</p>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Condición de pago */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary-500" />
          </div>
          <h3 className="font-medium text-gray-900">Condición de pago</h3>
        </div>

        <div className="space-y-3">
          {payments.map((payment, index) => (
            <div key={index} className="flex items-center gap-3">
              <select
                value={payment.metodo}
                onChange={(e) => {
                  const newPayments = [...payments];
                  newPayments[index].metodo = e.target.value;
                  setPayments(newPayments);
                }}
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={payment.monto || ''}
                onChange={(e) => {
                  const newPayments = [...payments];
                  newPayments[index].monto = parseFloat(e.target.value) || 0;
                  setPayments(newPayments);
                }}
                className="w-32 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Monto"
              />
              {payments.length > 1 && (
                <button
                  onClick={() => setPayments(payments.filter((_, i) => i !== index))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => setPayments([...payments, { metodo: 'Efectivo', monto: 0 }])}
          className="flex items-center gap-2 mt-3 text-primary-500 font-medium hover:text-primary-600"
        >
          <Plus className="w-4 h-4" />
          Pago Múltiple
        </button>
      </div>

      {/* Información adicional */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
            <span className="text-primary-500 font-bold">ℹ</span>
          </div>
          <h3 className="font-medium text-gray-900">Información adicional</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Observación</label>
            <textarea
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              rows={3}
              placeholder="Observaciones..."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Dirección de envío</label>
            <input
              type="text"
              value={form.direccionEnvio}
              onChange={(e) => setForm({ ...form, direccionEnvio: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Dirección de envío"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Origen de compra <span className="text-red-500">*</span></label>
            <div className="flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg">
              <span className="text-gray-900">{form.origenCompra}</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Totales */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">S/ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">IGV (18%)</span>
            <span className="text-gray-900">S/ {igv.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span className="text-gray-900">Total</span>
            <span className="text-primary-500">S/ {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Botones fijos abajo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || cart.length === 0}
            className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </div>

      {/* Modal de productos */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Seleccionar producto</h3>
                <button onClick={() => setShowProductModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Buscar producto..."
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.nombre}</p>
                    <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                  </div>
                  <p className="font-bold text-primary-500">S/ {Number(product.precioConIGV).toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de clientes */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Seleccionar cliente</h3>
                <button onClick={() => setShowClientModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Buscar cliente..."
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => selectClient(client)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                    <span className="text-primary-500 font-semibold text-sm">
                      {client.nombres?.charAt(0) || client.razonSocial?.charAt(0) || 'C'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {client.razonSocial || `${client.nombres || ''} ${client.apellidos || ''}`.trim()}
                    </p>
                    <p className="text-sm text-gray-500">{client.tipoDoc}: {client.numeroDoc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
