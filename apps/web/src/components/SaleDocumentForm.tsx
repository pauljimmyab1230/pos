import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Product, Client, CartItem } from '../../../packages/shared/types';
import { Plus, Search, XCircle, ShoppingCart, Package, CreditCard, ArrowLeft, Check, User, FileText, Trash2, AlertTriangle } from 'lucide-react';

interface SaleDocumentFormProps {
  tipo: string;
  initialCart?: CartItem[];
  initialClient?: Client;
  onSave: (data: any) => Promise<void>;
}

export default function SaleDocumentForm({ tipo, initialCart = [], initialClient, onSave }: SaleDocumentFormProps) {
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [showProductScreen, setShowProductScreen] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showTempProductModal, setShowTempProductModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    clienteId: initialClient?.id || '',
    tipoDoc: initialClient?.tipoDoc || 'DNI',
    numeroDoc: initialClient?.numeroDoc || '',
    clienteNombre: initialClient?.razonSocial || `${initialClient?.nombres || ''} ${initialClient?.apellidos || ''}`.trim() || 'Cliente Varios',
    clienteDireccion: initialClient?.direccion || '',
    metodoPago: 'Efectivo',
    observacion: '',
    direccionEnvio: '',
    origenCompra: 'Tienda Física',
  });

  const [tempProduct, setTempProduct] = useState({
    tipo: 'Producto',
    nombre: '',
    categoriaSunat: 'Gravada',
    precioConIGV: '',
    precioSinIGV: '',
  });

  useEffect(() => { loadFormData(); }, []);

  const loadFormData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.getProducts({ limit: '1000' }) as Promise<{ data: Product[]; pagination: any }>,
        api.getClients({ limit: '1000' }) as Promise<{ data: Client[]; pagination: any }>
      ]);
      setProducts(pRes.data);
      setClients(cRes.data);
    } catch (error) { console.error(error); }
  };

  const filteredProducts = products.filter(p => p.nombre.toLowerCase().includes(searchProduct.toLowerCase()));
  const filteredClients = clients.filter(c => c.nombres?.toLowerCase().includes(searchClient.toLowerCase()) || c.razonSocial?.toLowerCase().includes(searchClient.toLowerCase()));

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmProductSelection = () => {
    const newItems: CartItem[] = [];
    const idsToUpdate: string[] = [];

    selectedProducts.forEach(id => {
      const product = products.find(p => p.id === id);
      if (product) {
        const existing = cart.find(item => item.product.id === id);
        if (existing) {
          idsToUpdate.push(id);
        } else {
          newItems.push({ product, cantidad: 1, precioUnit: Number(product.precioConIGV) });
        }
      }
    });

    setCart(prev => {
      const updated = prev.map(item =>
        idsToUpdate.includes(item.product.id)
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      );
      return [...updated, ...newItems];
    });

    setSelectedProducts([]);
    setShowProductScreen(false);
  };

  const updateQuantity = (id: string, cant: number) => {
    const c = Number(cant) || 0;
    if (c <= 0) setCart(cart.filter(i => i.product.id !== id));
    else setCart(cart.map(i => i.product.id === id ? { ...i, cantidad: c } : i));
  };

  const removeItem = (id: string) => {
    setCart(cart.filter(i => i.product.id !== id));
  };

  const selectClient = (client: Client) => {
    setForm({ ...form, clienteId: client.id, tipoDoc: client.tipoDoc, numeroDoc: client.numeroDoc, clienteNombre: client.razonSocial || `${client.nombres || ''} ${client.apellidos || ''}`.trim(), clienteDireccion: client.direccion || '' });
    setShowClientModal(false);
  };

  const calcularTemp = (val: string) => {
    const p = parseFloat(val) || 0;
    setTempProduct({ ...tempProduct, precioConIGV: val, precioSinIGV: (p / 1.18).toFixed(2) });
  };

  const addTempProduct = () => {
    if (!tempProduct.nombre.trim()) {
      return;
    }
    if (!tempProduct.precioConIGV || parseFloat(tempProduct.precioConIGV) <= 0) {
      return;
    }
    const newP: Product = { 
      id: 'temp-' + Date.now(), 
      tipo: tempProduct.tipo, 
      nombre: tempProduct.nombre.trim(), 
      precioConIGV: parseFloat(tempProduct.precioConIGV), 
      precioSinIGV: parseFloat(tempProduct.precioSinIGV) || parseFloat(tempProduct.precioConIGV) / 1.18,
      stock: 999, 
      stockMinimo: 0,
      unidadMedida: 'NIU',
      categoriaSunat: tempProduct.categoriaSunat,
      catalogoVirtual: false,
      activo: true,
    };
    setCart([...cart, { product: newP, cantidad: 1, precioUnit: newP.precioConIGV }]);
    setShowTempProductModal(false);
    setTempProduct({ tipo: 'Producto', nombre: '', categoriaSunat: 'Gravada', precioConIGV: '', precioSinIGV: '' });
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      // Separar items reales y temporales
      const realItems = cart
        .filter(i => !i.product.id.startsWith('temp-'))
        .map(i => ({ productId: i.product.id, cantidad: i.cantidad, precioUnit: Number(i.precioUnit || i.product.precioConIGV) }));

      const tempItems = cart.filter(i => i.product.id.startsWith('temp-'));
      const createdTempItems = [];

      // Crear productos temporales en el backend
      for (const item of tempItems) {
        const newProduct = await api.createProduct({
          tipo: item.product.tipo,
          nombre: item.product.nombre,
          categoriaSunat: item.product.categoriaSunat || 'Gravada',
          unidadMedida: 'NIU',
          precioConIGV: item.precioUnit,
          precioSinIGV: Number(item.precioUnit) / 1.18,
          stock: 0,
          stockMinimo: 0,
          temporal: true,
        }) as { id: string };
        createdTempItems.push({
          productId: newProduct.id,
          cantidad: item.cantidad,
          precioUnit: Number(item.precioUnit || item.product.precioConIGV),
        });
      }

      await onSave({
        clienteId: form.clienteId,
        items: [...realItems, ...createdTempItems],
        metodoPago: form.metodoPago,
        observacion: form.observacion,
        direccionEnvio: form.direccionEnvio,
        origenCompra: form.origenCompra,
      });
    } catch (error) { console.error(error); } finally { setSubmitting(false); }
  };

  const total = cart.reduce((sum, i) => sum + (Number(i.precioUnit || i.product.precioConIGV) * i.cantidad), 0);
  const subtotal = total / 1.18;
  const igv = total - subtotal;
  const getSerie = () => tipo === 'NOTA_VENTA' ? 'NV01' : tipo === 'BOLETA' ? 'B001' : 'F001';

  // Product selection screen
  if (showProductScreen) {
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <button onClick={() => { setShowProductScreen(false); setSelectedProducts([]); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-600 dark:text-gray-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold flex-1 text-gray-900 dark:text-white">Agregar Producto</h1>
          {selectedProducts.length > 0 && (
            <button onClick={confirmProductSelection} className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl flex items-center justify-center hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/25 transition-all">
              <Check className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={searchProduct} onChange={e => setSearchProduct(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all" placeholder="Buscar productos..." />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-3 py-4">
          {filteredProducts.map(p => (
            <button key={p.id} onClick={() => toggleProductSelection(p.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${selectedProducts.includes(p.id) ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-lg shadow-primary-500/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${p.tipo === 'Servicio' ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-primary-50 dark:bg-primary-500/10'}`}>
                <Package className={`w-7 h-7 ${p.tipo === 'Servicio' ? 'text-blue-500 dark:text-blue-400' : 'text-primary-500 dark:text-primary-400'}`} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white uppercase">{p.nombre}</h3>
                <span className={`text-sm ${p.stock > 0 ? 'text-gray-500 dark:text-gray-400' : 'text-red-500 dark:text-red-400'}`}>{p.stock > 0 ? `Stock: ${p.stock}` : 'Sin stock'}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary-500 dark:text-primary-400">S/ {Number(p.precioConIGV).toFixed(2)}</p>
              </div>
              {selectedProducts.includes(p.id) && <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto w-full">
        {/* Header info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Serie</p><p className="font-semibold text-gray-900 dark:text-white">{getSerie()}</p></div>
            <div><p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Fecha</p><p className="font-semibold text-gray-900 dark:text-white">{new Date().toLocaleDateString('es-PE')}</p></div>
            <div><p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Moneda</p><p className="font-semibold text-gray-900 dark:text-white">S/ Soles</p></div>
          </div>
        </div>

        {/* Client data */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 dark:bg-primary-500/10 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-primary-500 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Datos del cliente</h3>
            </div>
            <button onClick={() => setShowClientModal(true)} className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl flex items-center justify-center hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/25 transition-all">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select value={form.tipoDoc} onChange={e => setForm({...form, tipoDoc: e.target.value})} className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all">
              <option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">Carnet</option><option value="Pasaporte">Pasaporte</option><option value="Otro">Otro</option>
            </select>
            <input type="text" value={form.numeroDoc} onChange={e => setForm({...form, numeroDoc: e.target.value})} className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" placeholder="N° documento" />
          </div>
          <input type="text" value={form.clienteNombre} onChange={e => setForm({...form, clienteNombre: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all mb-3" placeholder="Nombres / Razón social" />
          <input type="text" value={form.clienteDireccion} onChange={e => setForm({...form, clienteDireccion: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" placeholder="Dirección" />
        </div>

        {/* Products */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-50 dark:bg-primary-500/10 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-500 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Productos</h3>
            <span className="ml-auto px-2.5 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold rounded-full">{cart.length}</span>
          </div>

          <div className="space-y-2 mb-4">
            <button onClick={() => setShowProductScreen(true)} className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25">
              <Search className="w-5 h-5" />
              Buscar productos
            </button>
            <button onClick={() => setShowTempProductModal(true)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-orange-300 dark:border-orange-500/50 text-orange-500 dark:text-orange-400 rounded-xl font-medium hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all">
              <AlertTriangle className="w-4 h-4" />
              Añadir producto temporal
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-400 dark:text-gray-500">No hay productos en el carrito</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm uppercase text-gray-900 dark:text-white truncate">{item.product.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.cantidad} x S/ {Number(item.precioUnit || item.product.precioConIGV).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQuantity(item.product.id, item.cantidad - 1)} className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center font-bold hover:bg-primary-600 transition-colors">-</button>
                    <span className="w-10 text-center font-semibold text-gray-900 dark:text-white">{item.cantidad}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.cantidad + 1)} className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center font-bold hover:bg-primary-600 transition-colors">+</button>
                  </div>
                  <button onClick={() => removeItem(item.product.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl p-5 text-white shadow-xl shadow-primary-500/20">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-white/70">Sub Total</span><span className="font-medium">S/ {subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/70">IGV (18%)</span><span className="font-medium">S/ {igv.toFixed(2)}</span></div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/20"><span>Total</span><span className="text-yellow-300">S/ {total.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-50 dark:bg-primary-500/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary-500 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Condición de pago</h3>
          </div>
          <select value={form.metodoPago} onChange={e => setForm({...form, metodoPago: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all">
            <option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option><option value="Tarjeta">Tarjeta</option><option value="Yape">Yape</option><option value="Plin">Plin</option>
          </select>
        </div>

        {/* Additional info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Información adicional</h3>
          <textarea value={form.observacion} onChange={e => setForm({...form, observacion: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all mb-3" rows={2} placeholder="Observación" />
          <input type="text" value={form.direccionEnvio} onChange={e => setForm({...form, direccionEnvio: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" placeholder="Dirección de envío" />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pb-6">
          <button onClick={() => window.history.back()} className="flex-1 py-3.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={submitting || cart.length === 0} className="flex-1 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/25">
            {submitting ? 'Generando...' : 'Generar Venta'}
          </button>
        </div>
      </div>

      {/* Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Seleccionar cliente</h3>
                <button onClick={() => setShowClientModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><XCircle className="w-5 h-5" /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={searchClient} onChange={e => setSearchClient(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Buscar..." />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {filteredClients.map(c => (
                <button key={c.id} onClick={() => selectClient(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center"><span className="text-white font-semibold text-sm">{c.nombres?.charAt(0) || c.razonSocial?.charAt(0) || 'C'}</span></div>
                  <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 dark:text-white truncate">{c.razonSocial || `${c.nombres || ''} ${c.apellidos || ''}`.trim()}</p><p className="text-sm text-gray-500 dark:text-gray-400">{c.tipoDoc}: {c.numeroDoc}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Temp Product Modal */}
      {showTempProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Producto Temporal</h3>
              </div>
              <button onClick={() => setShowTempProductModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label><input type="text" value={tempProduct.nombre} onChange={e => setTempProduct({...tempProduct, nombre: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Nombre del producto" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio con IGV</label><input type="number" step="0.01" value={tempProduct.precioConIGV} onChange={e => calcularTemp(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0.00" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio sin IGV</label><input type="number" step="0.01" value={tempProduct.precioSinIGV} onChange={e => setTempProduct({...tempProduct, precioSinIGV: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0.00" /></div>
              </div>
              <button onClick={addTempProduct} className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/25">Agregar producto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
