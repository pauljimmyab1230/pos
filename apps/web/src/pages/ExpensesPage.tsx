import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToastStore } from '../stores/toast.store';
import { ListSkeleton } from '../components/Skeleton';
import {
  Receipt,
  Plus,
  Search,
  Edit2,
  Trash2,
  XCircle,
  Calendar,
  Tag,
  FolderOpen,
} from 'lucide-react';

interface Expense {
  id: string;
  descripcion: string;
  categoria: string;
  monto: number;
  pagado: boolean;
  metodoPago?: string;
  fechaPago?: string;
  proveedor?: string;
  comprobante?: string;
  createdAt: string;
}

export default function ExpensesPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    descripcion: '',
    categoria: 'Operaciones',
    monto: '',
    pagado: true,
    metodoPago: 'Efectivo',
    fechaPago: new Date().toISOString().split('T')[0],
    proveedor: '',
    comprobante: '',
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = (await api.getExpenses()) as Expense[];
      setExpenses(data);
    } catch (error) {
      showToast('Error al cargar gastos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descripcion.trim() || !form.monto) {
      showToast('Completa todos los campos obligatorios', 'error');
      return;
    }

    try {
      const payload = {
        ...form,
        monto: parseFloat(form.monto),
        fechaPago: form.fechaPago ? new Date(form.fechaPago) : null,
      };

      if (editingExpense) {
        await api.updateExpense(editingExpense.id, payload);
        showToast('Gasto actualizado', 'success');
      } else {
        await api.createExpense(payload);
        showToast('Gasto registrado', 'success');
      }

      setShowForm(false);
      setEditingExpense(null);
      resetForm();
      loadExpenses();
    } catch (error) {
      showToast('Error al guardar gasto', 'error');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      descripcion: expense.descripcion,
      categoria: expense.categoria,
      monto: String(expense.monto),
      pagado: expense.pagado,
      metodoPago: expense.metodoPago || 'Efectivo',
      fechaPago: expense.fechaPago
        ? new Date(expense.fechaPago).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      proveedor: expense.proveedor || '',
      comprobante: expense.comprobante || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await api.deleteExpense(id);
      showToast('Gasto eliminado', 'success');
      loadExpenses();
    } catch (error) {
      showToast('Error al eliminar gasto', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      descripcion: '',
      categoria: 'Operaciones',
      monto: '',
      pagado: true,
      metodoPago: 'Efectivo',
      fechaPago: new Date().toISOString().split('T')[0],
      proveedor: '',
      comprobante: '',
    });
  };

  const filteredExpenses = expenses.filter(
    (e) =>
      e.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      e.categoria.toLowerCase().includes(search.toLowerCase()) ||
      e.proveedor?.toLowerCase().includes(search.toLowerCase())
  );

  const totalGastos = filteredExpenses.reduce((sum, e) => sum + e.monto, 0);

  const categorias = [
    'Operaciones',
    'Marketing',
    'Personal',
    'Servicios',
    'Impuestos',
    'Mantenimiento',
    'Otros',
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-500/10 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary-500 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Gastos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'registro' : 'registros'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-lg font-bold text-primary-500 dark:text-primary-400">S/ {totalGastos.toFixed(2)}</p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Buscar gastos..."
        />
      </div>

      {/* Lista */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No hay gastos registrados</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Crea un nuevo gasto para comenzar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-red-500 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{expense.descripcion}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Tag className="w-4 h-4" />
                    <span>{expense.categoria}</span>
                    {expense.fechaPago && (
                      <>
                        <span>•</span>
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(expense.fechaPago).toLocaleDateString('es-PE')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-500 dark:text-red-400">S/ {expense.monto.toFixed(2)}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      expense.pagado
                        ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                    }`}
                  >
                    {expense.pagado ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => {
          resetForm();
          setEditingExpense(null);
          setShowForm(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingExpense(null);
                }}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Descripción del gasto"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                >
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Método de pago
                  </label>
                  <select
                    value={form.metodoPago}
                    onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Yape">Yape</option>
                    <option value="Plin">Plin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de pago
                  </label>
                  <input
                    type="date"
                    value={form.fechaPago}
                    onChange={(e) => setForm({ ...form, fechaPago: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Proveedor
                </label>
                <input
                  type="text"
                  value={form.proveedor}
                  onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  N° Comprobante
                </label>
                <input
                  type="text"
                  value={form.comprobante}
                  onChange={(e) => setForm({ ...form, comprobante: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="N° de comprobante"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.pagado}
                    onChange={(e) => setForm({ ...form, pagado: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
                <span className="text-sm text-gray-700 dark:text-gray-300">Pagado</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingExpense(null);
                  }}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
                >
                  {editingExpense ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
