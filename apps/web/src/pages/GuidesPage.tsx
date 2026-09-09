import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToastStore } from '../stores/toast.store';
import { ListSkeleton } from '../components/Skeleton';
import {
  Truck,
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Guide {
  id: string;
  serie: string;
  correlativo: number;
  fechaEmision: string;
  destinatarioNombres?: string;
  destinatarioNumDoc?: string;
  destinoDireccion?: string;
  motivoEnvio?: string;
  estado?: string;
  items?: Array<{
    id: string;
    cantidad: number;
    product?: { nombre: string };
  }>;
}

export default function GuidesPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    setLoading(true);
    try {
      const data = (await api.getGuides()) as Guide[];
      setGuides(data);
    } catch (error) {
      showToast('Error al cargar guías', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredGuides = guides.filter(
    (g) =>
      g.serie?.toLowerCase().includes(search.toLowerCase()) ||
      g.destinatarioNombres?.toLowerCase().includes(search.toLowerCase()) ||
      g.destinatarioNumDoc?.includes(search)
  );

  const totalPages = Math.ceil(filteredGuides.length / itemsPerPage);
  const paginatedGuides = filteredGuides.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Guías de Remisión</h1>
        <span className="text-sm text-gray-500">{filteredGuides.length} guías</span>
      </div>

      {/* Búsqueda */}
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
          placeholder="Buscar por serie, destinatario..."
        />
      </div>

      {/* Lista */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : paginatedGuides.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No hay guías de remisión</div>
      ) : (
        <div className="space-y-3">
          {paginatedGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {guide.serie}-{guide.correlativo}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {guide.destinatarioNombres || 'Sin destinatario'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    {guide.motivoEnvio && (
                      <>
                        <span>{guide.motivoEnvio}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>
                      {new Date(guide.fechaEmision).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {guide.items?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500">
            Mostrando {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, filteredGuides.length)} de{' '}
            {filteredGuides.length}
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
    </div>
  );
}
