import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useQuotesStore } from '../stores/quotes.store';
import { useProductsStore } from '../stores/products.store';
import { useClientsStore } from '../stores/clients.store';
import { useToastStore } from '../stores/toast.store';
import { ListSkeleton, GridSkeleton } from '../components/Skeleton';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  Grid,
  List,
  Check,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShoppingCart,
  Package,
  CreditCard,
  ScanLine,
  Camera,
  Wrench,
  Barcode,
  ArrowLeft,
} from 'lucide-react';

interface Quote {
  id: string;
  serie: string;
  correlativo: number;
  fechaEmision: string;
  estado: string;
  total: number;
  metodoPago?: string;
  pagos?: Array<{ metodo: string; monto: number }>;
  cliente?: {
    id?: string;
    nombres?: string;
    apellidos?: string;
    razonSocial?: string;
    numeroDoc?: string;
    direccion?: string;
  };
  items?: Array<{
    id: string;
    productId: string;
    cantidad: number;
    precioUnit: number;
    product?: any;
  }>;
  observacion?: string;
  direccionEnvio?: string;
  origenCompra?: string;
}

interface Product {
  id: string;
  tipo: string;
  nombre: string;
  precioConIGV: number;
  precioSinIGV?: number;
  stock: number;
  codigo?: string;
  barcode?: string;
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
  precioUnit: number;
}

export default function QuotesPage() {
  const {
    quotes,
    loading: quotesLoading,
    loadQuotes,
    createQuote,
    updateQuote,
    deleteQuote,
    convertQuote,
  } = useQuotesStore();
  const { products, loadProducts } = useProductsStore();
  const { clients, loadClients } = useClientsStore();
  const showToast = useToastStore((s) => s.showToast);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('quotes-view-mode') as 'list' | 'grid') || 'list';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showProductScreen, setShowProductScreen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showTempProductModal, setShowTempProductModal] = useState(false);
  const [tempProduct, setTempProduct] = useState({
    tipo: 'Producto',
    nombre: '',
    categoriaSunat: 'Gravada',
    precioConIGV: '',
    precioSinIGV: '',
  });
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const itemsPerPage = 12;

  const [form, setForm] = useState({
    clienteId: '',
    tipoDoc: 'DNI',
    numeroDoc: '',
    clienteNombre: '',
    clienteDireccion: '',
    metodoPago: 'Efectivo',
    observacion: '',
    direccionEnvio: '',
    origenCompra: 'Tienda Física',
    descuentoGlobal: false,
    porcentajeDescuento: 0,
    pagoMultiple: false,
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<{ metodo: string; monto: number }[]>([
    { metodo: 'Efectivo', monto: 0 },
  ]);

  useEffect(() => {
    loadQuotes().catch(() => showToast('Error al cargar cotizaciones', 'error'));
  }, []);

  const loadFormData = async () => {
    setLoadingProducts(true);
    try {
      await Promise.all([loadProducts(), loadClients()]);
    } catch (error) {
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredQuotes = quotes.filter(
    (q) =>
      q.serie?.toLowerCase().includes(search.toLowerCase()) ||
      q.cliente?.razonSocial?.toLowerCase().includes(search.toLowerCase()) ||
      q.cliente?.nombres?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const paginatedQuotes = filteredQuotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const filteredProducts = products.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const filteredClients = clients.filter(
    (c) =>
      c.nombres?.toLowerCase().includes(searchClient.toLowerCase()) ||
      c.apellidos?.toLowerCase().includes(searchClient.toLowerCase()) ||
      c.razonSocial?.toLowerCase().includes(searchClient.toLowerCase()) ||
      c.numeroDoc?.includes(searchClient)
  );

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const confirmProductSelection = () => {
    const newItems: CartItem[] = [];

    selectedProducts.forEach((productId) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        const existing = cart.find((item) => item.product.id === productId);
        if (!existing) {
          newItems.push({
            product,
            cantidad: 1,
            precioUnit: Number(product.precioConIGV) || 0,
          });
        }
      }
    });

    // Actualizar carrito con items existentes + nuevos
    setCart((prevCart) => {
      const updatedCart = prevCart.map((item) => {
        if (selectedProducts.includes(item.product.id)) {
          return { ...item, cantidad: item.cantidad + 1 };
        }
        return item;
      });
      return [...updatedCart, ...newItems];
    });

    setSelectedProducts([]);
    setShowProductScreen(false);
  };

  const updateQuantity = (productId: string, cantidad: number) => {
    const newCantidad = Number(cantidad) || 0;
    if (newCantidad <= 0) {
      setCart(cart.filter((item) => item.product.id !== productId));
    } else {
      setCart(
        cart.map((item) =>
          item.product.id === productId ? { ...item, cantidad: newCantidad } : item
        )
      );
    }
  };

  const calcularPrecioTempSinIGV = (precioConIGV: string) => {
    const precio = parseFloat(precioConIGV) || 0;
    const sinIGV = precio / 1.18;
    setTempProduct({ ...tempProduct, precioConIGV, precioSinIGV: sinIGV.toFixed(2) });
  };

  const addTempProduct = () => {
    if (!tempProduct.nombre || !tempProduct.precioConIGV) {
      showToast('Ingresa nombre y precio', 'error');
      return;
    }

    const newProduct: Product = {
      id: 'temp-' + Date.now(),
      tipo: tempProduct.tipo,
      nombre: tempProduct.nombre,
      precioConIGV: parseFloat(tempProduct.precioConIGV),
      precioSinIGV: parseFloat(tempProduct.precioSinIGV) || parseFloat(tempProduct.precioConIGV) / 1.18,
      stock: 999,
      categoriaSunat: tempProduct.categoriaSunat,
    };

    setCart([...cart, { product: newProduct, cantidad: 1, precioUnit: newProduct.precioConIGV }]);
    setShowTempProductModal(false);
    setTempProduct({
      tipo: 'Producto',
      nombre: '',
      categoriaSunat: 'Gravada',
      precioConIGV: '',
      precioSinIGV: '',
    });
    showToast('Producto temporal agregado', 'success');
  };

  const selectClient = (client: Client) => {
    setForm({
      ...form,
      clienteId: client.id,
      tipoDoc: client.tipoDoc,
      numeroDoc: client.numeroDoc,
      clienteNombre:
        client.razonSocial || `${client.nombres || ''} ${client.apellidos || ''}`.trim(),
      clienteDireccion: client.direccion || '',
    });
    setShowClientModal(false);
    setSearchClient('');
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      showToast('Agrega al menos un producto', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const realItems = cart
        .filter((item) => !item.product.id.startsWith('temp-'))
        .map((item) => ({
          productId: item.product.id,
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
        }));

      const tempItems = [];
      for (const item of cart.filter((item) => item.product.id.startsWith('temp-'))) {
        try {
          const newProduct = (await api.createProduct({
            tipo: item.product.tipo,
            nombre: item.product.nombre,
            categoriaSunat: item.product.categoriaSunat || 'Gravada',
            unidadMedida: 'NIU',
            precioConIGV: item.precioUnit,
            precioSinIGV: Number(item.precioUnit) / 1.18,
            stock: 0,
            stockMinimo: 0,
            temporal: true,
          })) as { id: string };
          tempItems.push({
            productId: newProduct.id,
            cantidad: item.cantidad,
            precioUnit: item.precioUnit,
          });
        } catch (err) {
          console.error('Error creando producto temporal:', err);
        }
      }

      const allItems = [...realItems, ...tempItems];

      if (allItems.length === 0) {
        showToast('No hay productos válidos para guardar', 'error');
        setSubmitting(false);
        return;
      }

      const payload = {
        clienteId: form.clienteId || null,
        items: allItems,
        metodoPago: form.pagoMultiple ? payments[0]?.metodo : form.metodoPago,
        pagos: form.pagoMultiple ? payments : [{ metodo: form.metodoPago, monto: total }],
        observacion: form.observacion,
        direccionEnvio: form.direccionEnvio,
        origenCompra: form.origenCompra,
      };

      if (editingQuote) {
        await updateQuote(editingQuote.id, payload);
        showToast('Cotización actualizada correctamente', 'success');
      } else {
        await createQuote(payload);
        showToast('Cotización creada correctamente', 'success');
      }

      setShowForm(false);
      setEditingQuote(null);
      resetForm();
    } catch (error) {
      showToast('Error al guardar cotización', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      clienteId: '',
      tipoDoc: 'DNI',
      numeroDoc: '',
      clienteNombre: '',
      clienteDireccion: '',
      metodoPago: 'Efectivo',
      observacion: '',
      direccionEnvio: '',
      origenCompra: 'Tienda Física',
      descuentoGlobal: false,
      porcentajeDescuento: 0,
      pagoMultiple: false,
    });
    setCart([]);
    setPayments([{ metodo: 'Efectivo', monto: 0 }]);
  };

  const handleConvert = async (id: string) => {
    if (!confirm('¿Convertir esta cotización a nota de venta?')) return;
    try {
      await convertQuote(id);
      showToast('Cotización convertida', 'success');
    } catch (error) {
      showToast('Error al convertir', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar cotización?')) return;
    try {
      await deleteQuote(id);
      showToast('Cotización eliminada', 'success');
    } catch (error) {
      showToast('Error al eliminar', 'error');
    }
  };

  const handleEdit = (quote: Quote) => {
    setEditingQuote(quote);

    const pagos = quote.pagos || [{ metodo: quote.metodoPago || 'Efectivo', monto: Number(quote.total) }];
    setPayments(pagos);

    setForm({
      clienteId: quote.cliente?.id || '',
      tipoDoc: 'DNI',
      numeroDoc: quote.cliente?.numeroDoc || '',
      clienteNombre:
        quote.cliente?.razonSocial ||
        `${quote.cliente?.nombres || ''} ${quote.cliente?.apellidos || ''}`.trim(),
      clienteDireccion: quote.cliente?.direccion || '',
      metodoPago: quote.metodoPago || 'Efectivo',
      observacion: quote.observacion || '',
      direccionEnvio: quote.direccionEnvio || '',
      origenCompra: quote.origenCompra || 'Tienda Física',
      descuentoGlobal: false,
      porcentajeDescuento: 0,
      pagoMultiple: pagos.length > 1,
    });

    if (quote.items) {
      const cartItems = quote.items.map((item) => ({
        product:
          item.product ||
          products.find((p) => p.id === item.productId) || {
            id: item.productId,
            nombre: 'Producto',
            precioConIGV: item.precioUnit,
            stock: 0,
            tipo: 'Producto',
          },
        cantidad: item.cantidad,
        precioUnit: Number(item.precioUnit),
      }));
      setCart(cartItems);
    }
    setShowForm(true);
    loadFormData();
  };

  const getClientName = (quote: Quote) => {
    if (quote.cliente?.razonSocial) return quote.cliente.razonSocial;
    return `${quote.cliente?.nombres || ''} ${quote.cliente?.apellidos || ''}`.trim() || 'Sin cliente';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendiente':
        return 'bg-yellow-50 text-yellow-700';
      case 'Aprobada':
        return 'bg-green-50 text-green-700';
      case 'Rechazada':
        return 'bg-red-50 text-red-700';
      case 'Convertida':
        return 'bg-blue-50 text-blue-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const totalSinDescuento = cart.reduce(
    (sum, item) => sum + Number(item.precioUnit) * item.cantidad,
    0
  );
  const descuento = form.descuentoGlobal
    ? (totalSinDescuento * form.porcentajeDescuento) / 100
    : 0;
  const total = totalSinDescuento - descuento;
  const subtotal = total / 1.18;
  const igv = total - subtotal;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Cotizaciones</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"
          >
            {viewMode === 'list' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
              loadFormData();
            }}
            className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-600"
          >
            <Plus className="w-5 h-5" /> Nueva
          </button>
        </div>
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
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          placeholder="Buscar por serie, cliente..."
        />
      </div>

      {/* Lista/Grid */}
      {quotesLoading ? (
        viewMode === 'list' ? <ListSkeleton count={5} /> : <GridSkeleton count={8} />
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {paginatedQuotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay cotizaciones</div>
          ) : (
            paginatedQuotes.map((quote) => (
              <div
                key={quote.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-7 h-7 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {quote.serie}-{quote.correlativo}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(
                          quote.estado
                        )}`}
                      >
                        {quote.estado}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{getClientName(quote)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(quote.fechaEmision).toLocaleDateString('es-PE')}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-primary-500">
                    S/ {Number(quote.total).toFixed(2)}
                  </p>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleEdit(quote)}
                      className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {quote.estado === 'Pendiente' && (
                      <button
                        onClick={() => handleConvert(quote.id)}
                        className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(quote.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {paginatedQuotes.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-500">No hay cotizaciones</div>
          ) : (
            paginatedQuotes.map((quote) => (
              <div
                key={quote.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm"
              >
                <div className="bg-gradient-to-br from-primary-400 to-primary-600 p-4">
                  <span className="px-2 py-1 bg-white/20 text-white text-xs rounded-full">
                    {quote.estado}
                  </span>
                  <div className="flex flex-col items-center py-4">
                    <FileText className="w-12 h-12 text-white mb-2" />
                    <span className="text-white text-sm">{quote.serie}</span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm text-center">
                    {quote.serie}-{quote.correlativo}
                  </h3>
                  <p className="text-xs text-gray-500 text-center truncate">
                    {getClientName(quote)}
                  </p>
                  <p className="text-primary-500 font-bold text-center mt-2">
                    S/ {Number(quote.total).toFixed(2)}
                  </p>
                  <div className="flex justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(quote)}
                      className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {quote.estado === 'Pendiente' && (
                      <button
                        onClick={() => handleConvert(quote.id)}
                        className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(quote.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
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
            Mostrando {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredQuotes.length)} de {filteredQuotes.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium ${
                  currentPage === page ? 'bg-primary-500 text-white' : 'border hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border rounded-lg disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => {
          resetForm();
          setShowForm(true);
          loadFormData();
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* MODAL NUEVA COTIZACIÓN */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">
                {editingQuote ? 'Editar Cotización' : 'Nueva Cotización'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingQuote(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Serie</p>
                  <p className="font-medium">CT01</p>
                </div>
                <div>
                  <p className="text-gray-500">Fecha</p>
                  <p className="font-medium">{new Date().toLocaleDateString('es-PE')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Moneda</p>
                  <p className="font-medium">PE (Soles)</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                      <span className="text-lg">👤</span>
                    </div>
                    <h3 className="font-medium">Datos del cliente</h3>
                  </div>
                  <button
                    onClick={async () => {
                      await loadFormData();
                      setShowClientModal(true);
                    }}
                    className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <select
                    value={form.tipoDoc}
                    onChange={(e) => setForm({ ...form, tipoDoc: e.target.value })}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                    <option value="CE">Carnet de extranjería</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                  <input
                    type="text"
                    value={form.numeroDoc}
                    onChange={(e) => setForm({ ...form, numeroDoc: e.target.value })}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="N° documento"
                  />
                </div>
                <input
                  type="text"
                  value={form.clienteNombre}
                  onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none mb-3"
                  placeholder="Nombres y apellidos / Razón social"
                />
                <input
                  type="text"
                  value={form.clienteDireccion}
                  onChange={(e) => setForm({ ...form, clienteDireccion: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Dirección"
                />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="font-medium">Productos y Servicios</h3>
                </div>
                <div className="space-y-2 mb-4">
                  <button
                    onClick={async () => {
                      await loadFormData();
                      setShowProductScreen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600"
                  >
                    <ScanLine className="w-5 h-5" /> Escanear con pistola lectora
                  </button>
                  <button
                    onClick={async () => {
                      await loadFormData();
                      setShowProductScreen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-primary-500 text-primary-500 rounded-xl font-medium hover:bg-primary-50"
                  >
                    <Camera className="w-5 h-5" /> Escanear con cámara
                  </button>
                  <button
                    onClick={async () => {
                      await loadFormData();
                      setShowProductScreen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-primary-500 text-primary-500 rounded-xl font-medium hover:bg-primary-50"
                  >
                    <Package className="w-5 h-5" /> Agregar manualmente
                  </button>
                  <button
                    onClick={() => setShowTempProductModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-orange-400 text-orange-500 rounded-xl font-medium hover:bg-orange-50"
                  >
                    <span className="text-orange-500">⚠️</span> Añadir producto temporal
                  </button>
                </div>
                {cart.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">No hay productos agregados</p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm uppercase">{item.product.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {item.cantidad} x {Number(item.precioUnit).toFixed(2)} ={' '}
                            {(Number(item.precioUnit) * item.cantidad).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.cantidad - 1)}
                            className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center hover:bg-primary-600 font-bold"
                          >
                            -
                          </button>
                          <span className="w-10 text-center font-medium">{item.cantidad}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.cantidad + 1)}
                            className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center hover:bg-primary-600 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="font-medium">Condición de pago</h3>
                </div>

                {!form.pagoMultiple ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Método de pago</label>
                      <select
                        value={form.metodoPago}
                        onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Yape">Yape</option>
                        <option value="Plin">Plin</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        setForm({ ...form, pagoMultiple: true });
                        setPayments([{ metodo: form.metodoPago, monto: total }]);
                      }}
                      className="flex items-center gap-2 text-primary-500 font-medium hover:text-primary-600"
                    >
                      <Plus className="w-4 h-4" /> Pago Múltiple
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <select
                          value={payment.metodo}
                          onChange={(e) => {
                            const newPayments = [...payments];
                            newPayments[index].metodo = e.target.value;
                            setPayments(newPayments);
                          }}
                          className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
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
                          className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-right"
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

                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-500">Total pagos:</span>
                      <span
                        className={`font-medium ${
                          Math.abs(
                            payments.reduce((sum, p) => sum + p.monto, 0) - total
                          ) < 0.01
                            ? 'text-green-500'
                            : 'text-orange-500'
                        }`}
                      >
                        S/ {payments.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}
                      </span>
                    </div>

                    {payments.length > 0 &&
                      payments[payments.length - 1].monto === 0 && (
                        <button
                          onClick={() => {
                            const pagado = payments
                              .slice(0, -1)
                              .reduce((sum, p) => sum + p.monto, 0);
                            const restante = total - pagado;
                            const newPayments = [...payments];
                            newPayments[newPayments.length - 1].monto = Math.max(0, restante);
                            setPayments(newPayments);
                          }}
                          className="w-full py-2 text-sm text-primary-500 border border-primary-200 rounded-lg hover:bg-primary-50"
                        >
                          Completar con S/{' '}
                          {(
                            total - payments.slice(0, -1).reduce((sum, p) => sum + p.monto, 0)
                          ).toFixed(2)}
                        </button>
                      )}

                    <button
                      onClick={() =>
                        setPayments([...payments, { metodo: 'Efectivo', monto: 0 }])
                      }
                      className="flex items-center gap-2 text-primary-500 font-medium hover:text-primary-600"
                    >
                      <Plus className="w-4 h-4" /> Pago Múltiple
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-medium mb-3">Información adicional</h3>
                <textarea
                  value={form.observacion}
                  onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none mb-3"
                  rows={2}
                  placeholder="Observación"
                />
                <input
                  type="text"
                  value={form.direccionEnvio}
                  onChange={(e) => setForm({ ...form, direccionEnvio: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Dirección de envío"
                />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sub Total</span>
                    <span className="text-gray-900">S/ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IGV (18.00%)</span>
                    <span className="text-gray-900">S/ {igv.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-primary-500">🏷️</span>
                      <span className="text-sm text-gray-600">Descuento global</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.descuentoGlobal}
                        onChange={(e) =>
                          setForm({ ...form, descuentoGlobal: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>

                  {form.descuentoGlobal && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={form.porcentajeDescuento}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            porcentajeDescuento: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                        placeholder="%"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500">% descuento</span>
                    </div>
                  )}

                  <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200">
                    <span className="text-gray-900">Total</span>
                    <span className="text-primary-500">S/ {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
                className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50"
              >
                {submitting ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANTALLA COMPLETA SELECCIONAR PRODUCTOS */}
      {showProductScreen && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col">
          <div className="flex items-center gap-4 p-4 border-b border-gray-200">
            <button
              onClick={() => {
                setShowProductScreen(false);
                setSelectedProducts([]);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold flex-1">Agregar Producto</h1>
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg"
            >
              {viewMode === 'list' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>
            {selectedProducts.length > 0 && (
              <button
                onClick={confirmProductSelection}
                className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Buscar productos"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400">
                <Barcode className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-3">
            <button className="px-5 py-2.5 rounded-xl font-medium text-sm bg-primary-500 text-white">
              Productos
            </button>
            <button className="px-5 py-2.5 rounded-xl font-medium text-sm bg-gray-100 text-gray-600">
              Servicios
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
            {loadingProducts ? (
              <ListSkeleton count={5} />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No se encontraron productos</div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => toggleProductSelection(product.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    selectedProducts.includes(product.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      product.tipo === 'Servicio' ? 'bg-blue-50' : 'bg-primary-50'
                    }`}
                  >
                    {product.tipo === 'Servicio' ? (
                      <Wrench className="w-7 h-7 text-blue-500" />
                    ) : (
                      <Package className="w-7 h-7 text-primary-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-semibold text-gray-900 uppercase">{product.nombre}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-sm ${
                          product.stock > 0 ? 'text-gray-500' : 'text-red-500'
                        }`}
                      >
                        {product.stock > 0 ? `Stock: ${product.stock}` : 'Sin stock'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-500">
                      S/ {Number(product.precioConIGV).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.categoriaSunat || 'Gravada'}
                    </p>
                  </div>
                  {selectedProducts.includes(product.id) && (
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          <button
            onClick={confirmProductSelection}
            className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
              selectedProducts.length > 0
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Modal Producto Temporal */}
      {showTempProductModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-orange-500 text-xl">⚠️</span>
                <h3 className="font-semibold">Añadir Producto Temporal</h3>
              </div>
              <button
                onClick={() => setShowTempProductModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-700 flex items-center gap-2">
                  <span className="text-orange-500">ℹ</span>
                  Este producto no se guardará en su sistema, solo se utilizará temporalmente en
                  esta venta.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Producto o Servicio</label>
                  <select
                    value={tempProduct.tipo}
                    onChange={(e) => setTempProduct({ ...tempProduct, tipo: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="Producto">Producto</option>
                    <option value="Servicio">Servicio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={tempProduct.nombre}
                    onChange={(e) => setTempProduct({ ...tempProduct, nombre: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Nombre del producto"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Categoría SUNAT</label>
                  <select
                    value={tempProduct.categoriaSunat}
                    onChange={(e) =>
                      setTempProduct({ ...tempProduct, categoriaSunat: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="Gravada">Gravada</option>
                    <option value="Exonerada">Exonerada</option>
                    <option value="Inafecta">Inafecta</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Precio con IGV</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tempProduct.precioConIGV}
                      onChange={(e) => calcularPrecioTempSinIGV(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Precio sin IGV</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tempProduct.precioSinIGV}
                      onChange={(e) =>
                        setTempProduct({ ...tempProduct, precioSinIGV: e.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <button
                  onClick={addTempProduct}
                  className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                >
                  Agregar Producto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clientes */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Seleccionar cliente</h3>
                <button
                  onClick={() => setShowClientModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Buscar..."
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => selectClient(client)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-left"
                >
                  <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                    <span className="text-primary-500 font-semibold text-sm">
                      {client.nombres?.charAt(0) || client.razonSocial?.charAt(0) || 'C'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {client.razonSocial ||
                        `${client.nombres || ''} ${client.apellidos || ''}`.trim()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {client.tipoDoc}: {client.numeroDoc}
                    </p>
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
