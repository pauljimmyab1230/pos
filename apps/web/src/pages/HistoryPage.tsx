import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { FileText, Check, XCircle, Search, Printer, Share2, Edit2, Trash2, ArrowRight } from 'lucide-react';

interface Document {
  id: string;
  tipo: string;
  serie: string;
  correlativo: number;
  fechaEmision: string;
  estado: string;
  total: number;
  cliente?: any;
  items?: any[];
  metodoPago?: string;
}

export default function HistoryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const [sales, quotes] = await Promise.all([
        api.getSales() as Promise<Document[]>,
        api.getQuotes() as Promise<Document[]>
      ]);
      
      // Combinar y marcar el tipo
      const allDocs = [
        ...sales.map(s => ({ ...s, tipo: s.tipo || 'NOTA_VENTA' })),
        ...quotes.map(q => ({ ...q, tipo: 'COTIZACION' }))
      ];
      
      // Ordenar por fecha
      allDocs.sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());
      
      setDocuments(allDocs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = filter.length > 0
    ? documents.filter((d) => filter.includes(d.tipo))
    : documents;

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Anular este documento?')) return;
    try {
      await api.cancelSale(id);
      showToast('Documento anulado', 'success');
      setShowMenu(false);
      setSelectedDoc(null);
      loadDocuments();
    } catch (error) {
      showToast('Error al anular', 'error');
    }
  };

  const handleConvert = async (tipo: string) => {
    if (!selectedDoc) return;
    try {
      if (selectedDoc.tipo === 'COTIZACION') {
        await api.convertQuote(selectedDoc.id);
        showToast(`Cotización convertida a ${tipo}`, 'success');
      } else {
        // Actualizar el tipo de documento existente
        await api.updateSale(selectedDoc.id, { tipo });
        showToast(`Documento actualizado a ${tipo}`, 'success');
      }
      setShowMenu(false);
      setSelectedDoc(null);
      loadDocuments();
    } catch (error) {
      showToast('Error al convertir', 'error');
    }
  };

  const tipoLabels: Record<string, string> = {
    BOLETA: 'Boleta',
    FACTURA: 'Factura',
    NOTA_VENTA: 'Nota de Venta',
    COTIZACION: 'Cotización',
  };

  const tipoColors: Record<string, string> = {
    BOLETA: 'bg-blue-50 text-blue-700',
    FACTURA: 'bg-purple-50 text-purple-700',
    NOTA_VENTA: 'bg-green-50 text-green-700',
    COTIZACION: 'bg-yellow-50 text-yellow-700',
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {toast.type === 'success' ? <Check className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      <h1 className="text-xl font-semibold">Historial de Ventas</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          placeholder="Buscar por cliente, correlativo o serie..."
        />
      </div>

      {/* Filtros - Toggle Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
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
                setFilter(filter.filter(v => v !== f.value));
              } else {
                setFilter([...filter, f.value]);
              }
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter.includes(f.value)
                ? 'bg-primary-500 text-white'
                : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de documentos */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay documentos</div>
        ) : (
          filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              onClick={() => { setSelectedDoc(doc); setShowMenu(true); }}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{tipoLabels[doc.tipo] || doc.tipo}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tipoColors[doc.tipo] || 'bg-gray-50 text-gray-700'}`}>
                      {doc.serie}-{doc.correlativo}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {doc.cliente?.razonSocial || doc.cliente?.nombres ? `${doc.cliente.nombres || ''} ${doc.cliente.apellidos || ''}`.trim() : 'Sin cliente'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {doc.fechaEmision ? new Date(doc.fechaEmision).toLocaleDateString('es-PE') : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-primary-500">S/ {Number(doc.total).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Detalle + Menú */}
      {selectedDoc && showMenu && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Comprobante de Venta</h2>
                <button onClick={() => { setShowMenu(false); setSelectedDoc(null); }} className="p-2 text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Info */}
            <div className="p-4 border-b">
              <div className="bg-primary-50 rounded-xl p-4 text-center">
                <p className="text-primary-600 font-medium">{tipoLabels[selectedDoc.tipo]} Electrónica</p>
                <p className="text-2xl font-bold text-gray-900">{selectedDoc.serie}-{selectedDoc.correlativo}</p>
                <p className="text-sm text-gray-500">{selectedDoc.fechaEmision ? new Date(selectedDoc.fechaEmision).toLocaleDateString('es-PE') : ''}</p>
              </div>
            </div>

            {/* Cliente */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                  <span className="text-primary-500 font-semibold">👤</span>
                </div>
                <div>
                  <p className="font-medium">{selectedDoc.cliente?.razonSocial || `${selectedDoc.cliente?.nombres || ''} ${selectedDoc.cliente?.apellidos || ''}`.trim() || 'Sin cliente'}</p>
                  <p className="text-sm text-gray-500">{selectedDoc.cliente?.tipoDoc}: {selectedDoc.cliente?.numeroDoc}</p>
                </div>
              </div>
            </div>

            {/* Productos */}
            <div className="p-4 border-b">
              <h3 className="font-medium mb-3">Productos y Servicios</h3>
              <div className="space-y-2">
                {selectedDoc.items?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.product?.nombre || 'Producto'}</p>
                      <p className="text-xs text-gray-500">{item.cantidad} x S/ {Number(item.precioUnit).toFixed(2)}</p>
                    </div>
                    <p className="font-medium">S/ {Number(item.subtotal).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t">
                <span className="font-bold">IMPORTE TOTAL</span>
                <span className="text-lg font-bold text-primary-500">S/ {Number(selectedDoc.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Menú de opciones */}
            <div className="p-4 space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center"><Printer className="w-5 h-5 text-red-500" /></div>
                <span className="flex-1 text-left font-medium">Imprimir Comprobante</span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center"><Share2 className="w-5 h-5 text-red-500" /></div>
                <span className="flex-1 text-left font-medium">Compartir</span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
              
              {/* Solo mostrar opciones de conversión para Nota de Venta y Cotización */}
              {(selectedDoc.tipo === 'NOTA_VENTA' || selectedDoc.tipo === 'COTIZACION') && (
                <>
                  <button onClick={() => handleConvert('FACTURA')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-red-500" /></div>
                    <span className="flex-1 text-left font-medium">Generar Factura</span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </button>
                  <button onClick={() => handleConvert('BOLETA')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-red-500" /></div>
                    <span className="flex-1 text-left font-medium">Generar Boleta</span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </button>
                </>
              )}

              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center"><Edit2 className="w-5 h-5 text-red-500" /></div>
                <span className="flex-1 text-left font-medium">Editar Comprobante</span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
              <button onClick={() => { handleCancel(selectedDoc.id); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-500" /></div>
                <span className="flex-1 text-left font-medium">Eliminar Comprobante</span>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
