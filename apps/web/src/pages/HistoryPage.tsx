import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToastStore } from '../stores/toast.store';
import { ListSkeleton } from '../components/Skeleton';
import { Sale, Quote, Client } from '../../../packages/shared/types';
import {
  FileText,
  Search,
  Printer,
  Share2,
  Edit2,
  Trash2,
  ArrowRight,
  XCircle,
  Clock,
  Receipt,
  Filter,
  Loader2,
} from 'lucide-react';

interface Document {
  id: string;
  tipo: string;
  serie: string;
  correlativo: number;
  fechaEmision: string;
  estado: string;
  total: number;
  cliente?: {
    id?: string;
    tipoDoc?: string;
    numeroDoc?: string;
    nombres?: string;
    apellidos?: string;
    razonSocial?: string;
    direccion?: string;
  };
  items?: Array<{
    id?: string;
    productId: string;
    cantidad: number;
    precioUnit: number;
    subtotal?: number;
    product?: {
      id: string;
      nombre: string;
    };
  }>;
  metodoPago?: string;
}

export default function HistoryPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [converting, setConverting] = useState(false);
  const [filter, setFilter] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const [salesRes, quotesRes] = await Promise.all([
        api.getSales({ limit: '500' }) as Promise<{ data: any[]; pagination: any }>,
        api.getQuotes({ limit: '500' }) as Promise<{ data: any[]; pagination: any }>,
      ]);
      
      const sales = salesRes.data.map((s) => ({ ...s, tipo: s.tipo || 'NOTA_VENTA' }));
      const quotes = quotesRes.data.map((q) => ({ ...q, tipo: 'COTIZACION' }));
      
      const allDocs = [...sales, ...quotes];
      allDocs.sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());
      setDocuments(allDocs);
    } catch (error) {
      showToast('Error al cargar documentos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((d) => {
    const matchesFilter = filter.length === 0 || filter.includes(d.tipo);
    const matchesSearch = searchTerm === '' ||
      d.serie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.cliente?.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.cliente?.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${d.serie}-${d.correlativo}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCancel = async (id: string) => {
    if (!confirm('¿Anular este documento?')) return;
    setCancelling(true);
    try {
      await api.cancelSale(id);
      showToast('Documento anulado correctamente', 'success');
      setShowMenu(false);
      setSelectedDoc(null);
      loadDocuments();
    } catch (error: any) {
      showToast(error.message || 'Error al anular documento', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleConvert = async (tipo: string) => {
    if (!selectedDoc) return;
    setConverting(true);
    try {
      if (selectedDoc.tipo === 'COTIZACION') {
        await api.convertQuote(selectedDoc.id);
        showToast(`Cotización convertida a ${tipo === 'FACTURA' ? 'Factura' : 'Boleta'}`, 'success');
      } else {
        await api.updateSale(selectedDoc.id, { tipo });
        showToast(`Documento actualizado a ${tipo === 'FACTURA' ? 'Factura' : 'Boleta'}`, 'success');
      }
      setShowMenu(false);
      setSelectedDoc(null);
      loadDocuments();
    } catch (error: any) {
      showToast(error.message || 'Error al convertir documento', 'error');
    } finally {
      setConverting(false);
    }
  };

  const tipoLabels: Record<string, string> = {
    BOLETA: 'Boleta',
    FACTURA: 'Factura',
    NOTA_VENTA: 'Nota de Venta',
    COTIZACION: 'Cotización',
  };

  const tipoIcons: Record<string, string> = {
    BOLETA: 'bg-blue-500',
    FACTURA: 'bg-purple-500',
    NOTA_VENTA: 'bg-emerald-500',
    COTIZACION: 'bg-amber-500',
  };

  const tipoBg: Record<string, string> = {
    BOLETA: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    FACTURA: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    NOTA_VENTA: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    COTIZACION: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Historial de Ventas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{filteredDocuments.length} documentos encontrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
          placeholder="Buscar por cliente, serie o correlativo..."
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
        {[
          { value: 'FACTURA', label: 'Factura' },
          { value: 'BOLETA', label: 'Boleta' },
          { value: 'NOTA_VENTA', label: 'Nota de venta' },
          { value: 'COTIZACION', label: 'Cotización' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => {
              if (filter.includes(f.value)) {
                setFilter(filter.filter((v) => v !== f.value));
              } else {
                setFilter([...filter, f.value]);
              }
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter.includes(f.value)
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Documents List */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">No hay documentos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              onClick={() => { setSelectedDoc(doc); setShowMenu(true); }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${tipoIcons[doc.tipo] || 'bg-gray-500'}`}>
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {tipoLabels[doc.tipo] || doc.tipo}
                    </h3>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${tipoBg[doc.tipo] || 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      {doc.serie}-{doc.correlativo}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {doc.cliente?.razonSocial || doc.cliente?.nombres ? `${doc.cliente.nombres || ''} ${doc.cliente.apellidos || ''}`.trim() : 'Sin cliente'}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {doc.fechaEmision ? new Date(doc.fechaEmision).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-primary-500 dark:text-primary-400">
                    S/ {Number(doc.total).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{doc.metodoPago || 'Efectivo'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDoc && showMenu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalle del Comprobante</h2>
                <button onClick={() => { setShowMenu(false); setSelectedDoc(null); }} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Info */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className={`rounded-2xl p-5 text-center ${tipoIcons[selectedDoc.tipo] || 'bg-gray-500'}`}>
                <p className="text-white/80 font-medium text-sm">
                  {tipoLabels[selectedDoc.tipo]} Electrónica
                </p>
                <p className="text-3xl font-bold text-white mt-1">
                  {selectedDoc.serie}-{selectedDoc.correlativo}
                </p>
                <p className="text-white/70 text-sm mt-2">
                  {selectedDoc.fechaEmision ? new Date(selectedDoc.fechaEmision).toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                </p>
              </div>
            </div>

            {/* Client */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {selectedDoc.cliente?.nombres?.charAt(0) || selectedDoc.cliente?.razonSocial?.charAt(0) || 'C'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedDoc.cliente?.razonSocial || `${selectedDoc.cliente?.nombres || ''} ${selectedDoc.cliente?.apellidos || ''}`.trim() || 'Sin cliente'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedDoc.cliente?.tipoDoc}: {selectedDoc.cliente?.numeroDoc}
                  </p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Productos</h3>
              <div className="space-y-3">
                {selectedDoc.items?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product?.nombre || 'Producto'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.cantidad} x S/ {Number(item.precioUnit).toFixed(2)}</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">S/ {Number(item.subtotal || item.precioUnit * item.cantidad).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="font-bold text-gray-900 dark:text-white">IMPORTE TOTAL</span>
                <span className="text-xl font-bold text-primary-500 dark:text-primary-400">
                  S/ {Number(selectedDoc.total).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 space-y-2">
              {(selectedDoc.tipo === 'NOTA_VENTA' || selectedDoc.tipo === 'COTIZACION') && (
                <>
                  <button 
                    onClick={() => handleConvert('FACTURA')} 
                    disabled={converting}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
                      {converting ? <Loader2 className="w-5 h-5 text-purple-500 animate-spin" /> : <FileText className="w-5 h-5 text-purple-500 dark:text-purple-400" />}
                    </div>
                    <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">Generar Factura</span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button 
                    onClick={() => handleConvert('BOLETA')} 
                    disabled={converting}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                      {converting ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <FileText className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
                    </div>
                    <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">Generar Boleta</span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </button>
                </>
              )}

              {selectedDoc.tipo === 'NOTA_VENTA' && (
                <button 
                  onClick={() => handleCancel(selectedDoc.id)} 
                  disabled={cancelling}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center">
                    {cancelling ? <Loader2 className="w-5 h-5 text-red-500 animate-spin" /> : <Trash2 className="w-5 h-5 text-red-500 dark:text-red-400" />}
                  </div>
                  <span className="flex-1 text-left font-medium text-red-600 dark:text-red-400">Anular Comprobante</span>
                  <ArrowRight className="w-5 h-5 text-red-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
