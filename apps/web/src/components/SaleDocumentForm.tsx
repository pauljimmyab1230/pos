import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plus, Search, XCircle, ShoppingCart, Package, CreditCard, ArrowLeft, Check } from 'lucide-react';

interface Product {
  id: string;
  tipo: string;
  nombre: string;
  precioConIGV: number;
  stock: number;
  categoriaSunat?: string;
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
  precioUnit?: number;
}

interface SaleDocumentFormProps {
  tipo: string;
  initialCart?: CartItem[];
  initialClient?: any;
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
      const [p, c] = await Promise.all([api.getProducts() as Promise<Product[]>, api.getClients() as Promise<Client[]>]);
      setProducts(p);
      setClients(c);
    } catch (error) { console.error(error); }
  };

  const filteredProducts = products.filter(p => p.nombre.toLowerCase().includes(searchProduct.toLowerCase()));
  const filteredClients = clients.filter(c => c.nombres?.toLowerCase().includes(searchClient.toLowerCase()) || c.razonSocial?.toLowerCase().includes(searchClient.toLowerCase()));

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmProductSelection = () => {
    const newItems: CartItem[] = [];
    selectedProducts.forEach(id => {
      const product = products.find(p => p.id === id);
      if (product) {
        const existing = cart.find(item => item.product.id === id);
        if (existing) { existing.cantidad += 1; }
        else { newItems.push({ product, cantidad: 1, precioUnit: Number(product.precioConIGV) }); }
      }
    });
    setCart([...cart, ...newItems]);
    setSelectedProducts([]);
    setShowProductScreen(false);
  };

  const updateQuantity = (id: string, cant: number) => {
    const c = Number(cant) || 0;
    if (c <= 0) setCart(cart.filter(i => i.product.id !== id));
    else setCart(cart.map(i => i.product.id === id ? { ...i, cantidad: c } : i));
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
    if (!tempProduct.nombre || !tempProduct.precioConIGV) return;
    const newP: Product = { id: 'temp-' + Date.now(), tipo: tempProduct.tipo, nombre: tempProduct.nombre, precioConIGV: parseFloat(tempProduct.precioConIGV), stock: 999, categoriaSunat: tempProduct.categoriaSunat };
    setCart([...cart, { product: newP, cantidad: 1, precioUnit: newP.precioConIGV }]);
    setShowTempProductModal(false);
    setTempProduct({ tipo: 'Producto', nombre: '', categoriaSunat: 'Gravada', precioConIGV: '', precioSinIGV: '' });
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onSave({
        clienteId: form.clienteId,
        items: cart.map(i => ({ productId: i.product.id, cantidad: i.cantidad, precioUnit: Number(i.precioUnit || i.product.precioConIGV) })),
        metodoPago: form.metodoPago,
        observacion: form.observacion,
        direccionEnvio: form.direccionEnvio,
        origenCompra: form.origenCompra,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const total = cart.reduce((sum, i) => sum + (Number(i.precioUnit || i.product.precioConIGV) * i.cantidad), 0);
  const subtotal = total / 1.18;
  const igv = total - subtotal;

  const getSerie = () => tipo === 'NOTA_VENTA' ? 'NV01' : tipo === 'BOLETA' ? 'B001' : 'F001';

  // Pantalla de selección de productos
  if (showProductScreen) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-4 border-b border-gray-200">
          <button onClick={() => { setShowProductScreen(false); setSelectedProducts([]); }} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-semibold flex-1">Agregar Producto</h1>
          {selectedProducts.length > 0 && <button onClick={confirmProductSelection} className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600"><Check className="w-5 h-5" /></button>}
        </div>
        <div className="p-4 border-b"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={searchProduct} onChange={e => setSearchProduct(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Buscar productos" /></div></div>
        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
          {filteredProducts.map(p => (
            <button key={p.id} onClick={() => toggleProductSelection(p.id)} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${selectedProducts.includes(p.id) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${p.tipo === 'Servicio' ? 'bg-blue-50' : 'bg-primary-50'}`}><Package className={`w-7 h-7 ${p.tipo === 'Servicio' ? 'text-blue-500' : 'text-primary-500'}`} /></div>
              <div className="flex-1 min-w-0 text-left"><h3 className="font-semibold text-gray-900 uppercase">{p.nombre}</h3><span className={`text-sm ${p.stock > 0 ? 'text-gray-500' : 'text-red-500'}`}>{p.stock > 0 ? `Stock: ${p.stock}` : 'Sin stock'}</span></div>
              <div className="text-right"><p className="text-lg font-bold text-primary-500">S/ {Number(p.precioConIGV).toFixed(2)}</p></div>
              {selectedProducts.includes(p.id) && <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Formulario principal
  return (
    <div className="flex flex-col">
      <div className="p-4 space-y-4">
        {/* Serie, Fecha */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-gray-500">Serie</p><p className="font-medium">{getSerie()}</p></div>
          <div><p className="text-gray-500">Fecha</p><p className="font-medium">{new Date().toLocaleDateString('es-PE')}</p></div>
          <div><p className="text-gray-500">Moneda</p><p className="font-medium">PE (Soles)</p></div>
        </div>

        {/* Datos del cliente */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center"><span className="text-lg">👤</span></div><h3 className="font-medium">Datos del cliente</h3></div>
            <button onClick={() => setShowClientModal(true)} className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select value={form.tipoDoc} onChange={e => setForm({...form, tipoDoc: e.target.value})} className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">Carnet</option><option value="Pasaporte">Pasaporte</option><option value="Otro">Otro</option></select>
            <input type="text" value={form.numeroDoc} onChange={e => setForm({...form, numeroDoc: e.target.value})} className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="N° documento" />
          </div>
          <input type="text" value={form.clienteNombre} onChange={e => setForm({...form, clienteNombre: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none mb-3" placeholder="Nombres / Razón social" />
          <input type="text" value={form.clienteDireccion} onChange={e => setForm({...form, clienteDireccion: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Dirección" />
        </div>

        {/* Productos */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-primary-500" /></div><h3 className="font-medium">Productos y Servicios</h3></div>
          <div className="space-y-2 mb-4">
            <button onClick={() => setShowProductScreen(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600">Escanear con pistola lectora</button>
            <button onClick={() => setShowProductScreen(true)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-primary-500 text-primary-500 rounded-xl font-medium hover:bg-primary-50">Escanear con cámara</button>
            <button onClick={() => setShowProductScreen(true)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-primary-500 text-primary-500 rounded-xl font-medium hover:bg-primary-50">Agregar manualmente</button>
            <button onClick={() => setShowTempProductModal(true)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-orange-400 text-orange-500 rounded-xl font-medium hover:bg-orange-50">⚠️ Añadir producto temporal</button>
          </div>
          {cart.length === 0 ? <p className="text-center text-gray-400 py-4">No hay productos</p> : cart.map(item => (
            <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-2">
              <div className="flex-1 min-w-0"><p className="font-medium text-sm uppercase">{item.product.nombre}</p><p className="text-xs text-gray-500">{item.cantidad} x S/ {Number(item.precioUnit || item.product.precioConIGV).toFixed(2)}</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.product.id, item.cantidad - 1)} className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center font-bold">-</button>
                <span className="w-10 text-center font-medium">{item.cantidad}</span>
                <button onClick={() => updateQuantity(item.product.id, item.cantidad + 1)} className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center font-bold">+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Sub Total</span><span>S/ {subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">IGV (18.00%)</span><span>S/ {igv.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total</span><span className="text-primary-500">S/ {total.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Pago */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center"><CreditCard className="w-5 h-5 text-primary-500" /></div><h3 className="font-medium">Condición de pago</h3></div>
          <select value={form.metodoPago} onChange={e => setForm({...form, metodoPago: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option><option value="Tarjeta">Tarjeta</option><option value="Yape">Yape</option><option value="Plin">Plin</option>
          </select>
        </div>

        {/* Info adicional */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="font-medium mb-3">Información adicional</h3>
          <textarea value={form.observacion} onChange={e => setForm({...form, observacion: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none mb-3" rows={2} placeholder="Observación" />
          <input type="text" value={form.direccionEnvio} onChange={e => setForm({...form, direccionEnvio: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Dirección de envío" />
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button onClick={() => window.history.back()} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={submitting || cart.length === 0} className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50">{submitting ? 'Generando...' : 'Generar'}</button>
        </div>
      </div>

      {/* Modal Clientes */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b"><div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Seleccionar cliente</h3><button onClick={() => setShowClientModal(false)} className="p-2 text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button></div>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={searchClient} onChange={e => setSearchClient(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Buscar..." /></div></div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {filteredClients.map(c => (
                <button key={c.id} onClick={() => selectClient(c)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-left">
                  <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center"><span className="text-primary-500 font-semibold text-sm">{c.nombres?.charAt(0) || c.razonSocial?.charAt(0) || 'C'}</span></div>
                  <div className="flex-1 min-w-0"><p className="font-medium text-gray-900 truncate">{c.razonSocial || `${c.nombres || ''} ${c.apellidos || ''}`.trim()}</p><p className="text-sm text-gray-500">{c.tipoDoc}: {c.numeroDoc}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Producto Temporal */}
      {showTempProductModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-orange-500 text-xl">⚠️</span><h3 className="font-semibold">Producto Temporal</h3></div><button onClick={() => setShowTempProductModal(false)} className="p-2 text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button></div>
            <div className="p-4 space-y-4">
              <div><label className="block text-sm text-gray-500 mb-1">Nombre</label><input type="text" value={tempProduct.nombre} onChange={e => setTempProduct({...tempProduct, nombre: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Nombre" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-gray-500 mb-1">Precio con IGV</label><input type="number" step="0.01" value={tempProduct.precioConIGV} onChange={e => calcularTemp(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0.00" /></div>
                <div><label className="block text-sm text-gray-500 mb-1">Precio sin IGV</label><input type="number" step="0.01" value={tempProduct.precioSinIGV} onChange={e => setTempProduct({...tempProduct, precioSinIGV: e.target.value})} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0.00" /></div>
              </div>
              <button onClick={addTempProduct} className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600">Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
