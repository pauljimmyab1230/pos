import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToastStore } from '../stores/toast.store';
import {
  FileText,
  FilePlus,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
} from 'lucide-react';

interface DailySummary {
  comprobantes: number;
  ingresos: number;
  egresos: number;
  saldo: number;
}

export default function HomePage() {
  const showToast = useToastStore((s) => s.showToast);
  const [summary, setSummary] = useState<DailySummary>({
    comprobantes: 0,
    ingresos: 0,
    egresos: 0,
    saldo: 0,
  });

  useEffect(() => {
    api
      .getDailySummary()
      .then((data) => setSummary(data as DailySummary))
      .catch(() => showToast('Error al cargar resumen', 'error'));
  }, []);

  const shortcuts = [
    { to: '/sales/new?tipo=BOLETA', label: 'Nueva Boleta', icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { to: '/sales/new?tipo=FACTURA', label: 'Nueva Factura', icon: FilePlus, color: 'bg-purple-50 text-purple-600' },
    { to: '/sales/new?tipo=COTIZACION', label: 'Nueva Cotización', icon: ClipboardList, color: 'bg-yellow-50 text-yellow-600' },
    { to: '/sales/new?tipo=NOTA_VENTA', label: 'Nueva Nota de Venta', icon: Receipt, color: 'bg-green-50 text-green-600' },
    { to: '/products', label: 'Productos', icon: Package, color: 'bg-primary-50 text-primary-600' },
    { to: '/clients', label: 'Clientes', icon: Users, color: 'bg-indigo-50 text-indigo-600' },
    { to: '/sales', label: 'Punto de Venta', icon: ShoppingCart, color: 'bg-red-50 text-red-600' },
    { to: '/cashbox', label: 'Caja', icon: Wallet, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-6">

      {/* Resumen del día */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Resumen del día</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Comprobantes</span>
            </div>
            <p className="text-3xl font-bold">{summary.comprobantes}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Ingresos</span>
            </div>
            <p className="text-3xl font-bold">S/ {summary.ingresos.toFixed(2)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Egresos</span>
            </div>
            <p className="text-3xl font-bold">S/ {summary.egresos.toFixed(2)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 opacity-80" />
              <span className="text-sm opacity-80">Saldo</span>
            </div>
            <p className="text-3xl font-bold">S/ {summary.saldo.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Accesos directos */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Accesos directos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
          {shortcuts.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-3 p-5 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
