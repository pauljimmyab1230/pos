import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
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
  Clock,
  Zap,
} from 'lucide-react';

interface DailySummary {
  comprobantes: number;
  ingresos: number;
  egresos: number;
  saldo: number;
}

export default function HomePage() {
  const showToast = useToastStore((s) => s.showToast);
  const { user } = useAuthStore();
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
    { to: '/sales/new?tipo=BOLETA', label: 'Nueva Boleta', icon: FileText, lightColor: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { to: '/sales/new?tipo=FACTURA', label: 'Nueva Factura', icon: FilePlus, lightColor: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { to: '/quotes', label: 'Cotización', icon: ClipboardList, lightColor: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { to: '/sales/new?tipo=NOTA_VENTA', label: 'Nota de Venta', icon: Receipt, lightColor: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { to: '/products', label: 'Productos', icon: Package, lightColor: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    { to: '/clients', label: 'Clientes', icon: Users, lightColor: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    { to: '/sales', label: 'Punto de Venta', icon: ShoppingCart, lightColor: 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' },
    { to: '/cashbox', label: 'Caja', icon: Wallet, lightColor: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  ];

  const stats = [
    {
      label: 'Comprobantes',
      value: summary.comprobantes,
      icon: FileText,
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Ingresos',
      value: `S/ ${summary.ingresos.toFixed(2)}`,
      icon: TrendingUp,
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Egresos',
      value: `S/ ${summary.egresos.toFixed(2)}`,
      icon: TrendingDown,
      bgColor: 'bg-rose-50 dark:bg-rose-500/10',
      textColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Saldo',
      value: `S/ ${summary.saldo.toFixed(2)}`,
      icon: DollarSign,
      bgColor: 'bg-primary-50 dark:bg-primary-500/10',
      textColor: 'text-primary-600 dark:text-primary-400',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {user?.nombre?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {new Date().toLocaleDateString('es-PE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <Link
          to="/sales/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transform hover:-translate-y-0.5"
        >
          <Zap className="w-5 h-5" />
          Venta Rápida
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen del día */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-primary-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/20 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold">Resumen del Día</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-sm text-white/80">Comprobantes</span>
            </div>
            <p className="text-3xl sm:text-4xl font-bold">{summary.comprobantes}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-400/30 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-200" />
              </div>
              <span className="text-sm text-white/80">Ingresos</span>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-emerald-200">S/ {summary.ingresos.toFixed(2)}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-rose-400/30 rounded-lg">
                <TrendingDown className="w-4 h-4 text-rose-200" />
              </div>
              <span className="text-sm text-white/80">Egresos</span>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-rose-200">S/ {summary.egresos.toFixed(2)}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-yellow-400/30 rounded-lg">
                <DollarSign className="w-4 h-4 text-yellow-200" />
              </div>
              <span className="text-sm text-white/80">Saldo</span>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-yellow-200">S/ {summary.saldo.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Accesos directos */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Accesos Directos</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {shortcuts.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-3 p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-200 group"
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${item.lightColor} group-hover:scale-110 transition-transform duration-200`}>
                <item.icon className="w-7 h-7" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
