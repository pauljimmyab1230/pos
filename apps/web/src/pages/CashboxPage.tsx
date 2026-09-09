import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToastStore } from '../stores/toast.store';
import { ListSkeleton } from '../components/Skeleton';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
} from 'lucide-react';

interface Movement {
  id: string;
  tipo: string;
  concepto: string;
  monto: number;
  categoria?: string;
  comprobante?: string;
  fecha: string;
}

export default function CashboxPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    tipo: 'INGRESO',
    concepto: '',
    monto: '',
    categoria: '',
    comprobante: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balanceData, movementsData] = await Promise.all([
        api.getBalance() as Promise<{ balance: number }>,
        api.getCashboxHistory() as Promise<Movement[]>,
      ]);
      setBalance(balanceData.balance);
      setMovements(movementsData);
    } catch (error) {
      showToast('Error al cargar datos de caja', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.concepto.trim() || !form.monto) {
      showToast('Completa todos los campos obligatorios', 'error');
      return;
    }

    try {
      await api.addMovement({
        tipo: form.tipo,
        concepto: form.concepto,
        monto: parseFloat(form.monto),
        categoria: form.categoria || undefined,
        comprobante: form.comprobante || undefined,
      });
      showToast('Movimiento registrado', 'success');
      setShowForm(false);
      setForm({ tipo: 'INGRESO', concepto: '', monto: '', categoria: '', comprobante: '' });
      loadData();
    } catch (error) {
      showToast('Error al registrar movimiento', 'error');
    }
  };

  const filteredMovements = movements.filter(
    (m) =>
      m.concepto.toLowerCase().includes(search.toLowerCase()) ||
      m.categoria?.toLowerCase().includes(search.toLowerCase())
  );

  const totalIngresos = movements
    .filter((m) => m.tipo === 'INGRESO')
    .reduce((sum, m) => sum + m.monto, 0);

  const totalEgresos = movements
    .filter((m) => m.tipo === 'EGRESO')
    .reduce((sum, m) => sum + m.monto, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Caja Registradora</h1>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Ingresos</span>
          </div>
          <p className="text-2xl font-bold">S/ {totalIngresos.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Egresos</span>
          </div>
          <p className="text-2xl font-bold">S/ {totalEgresos.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-80">Saldo</span>
          </div>
          <p className="text-2xl font-bold">S/ {balance.toFixed(2)}</p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          placeholder="Buscar movimientos..."
        />
      </div>

      {/* Lista de movimientos */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : filteredMovements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No hay movimientos</div>
      ) : (
        <div className="space-y-2">
          {filteredMovements.map((movement) => (
            <div
              key={movement.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  movement.tipo === 'INGRESO' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                {movement.tipo === 'INGRESO' ? (
                  <ArrowUpRight className="w-6 h-6 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-6 h-6 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{movement.concepto}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {movement.categoria && <span>{movement.categoria}</span>}
                  <span>•</span>
                  <span>{new Date(movement.fecha).toLocaleDateString('es-PE')}</span>
                </div>
              </div>
              <p
                className={`text-lg font-bold ${
                  movement.tipo === 'INGRESO' ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {movement.tipo === 'INGRESO' ? '+' : '-'} S/ {movement.monto.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Nuevo Movimiento</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipo: 'INGRESO' })}
                    className={`py-3 rounded-xl font-medium transition-colors ${
                      form.tipo === 'INGRESO'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipo: 'EGRESO' })}
                    className={`py-3 rounded-xl font-medium transition-colors ${
                      form.tipo === 'EGRESO'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Egreso
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Concepto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Ej: Venta de producto"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">Seleccionar categoría</option>
                  <option value="Ventas">Ventas</option>
                  <option value="Compras">Compras</option>
                  <option value="Sueldos">Sueldos</option>
                  <option value="Alquiler">Alquiler</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprobante
                </label>
                <input
                  type="text"
                  value={form.comprobante}
                  onChange={(e) => setForm({ ...form, comprobante: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="N° de comprobante"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
