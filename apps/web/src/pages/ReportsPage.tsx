import { useState } from 'react';
import { api } from '../services/api';
import { BarChart3, FileText, Package, Users } from 'lucide-react';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async (type: string) => {
    setActiveReport(type);
    setLoading(true);
    try {
      let data;
      if (type === 'sales') data = await api.getSalesReport();
      else if (type === 'monthly') data = await api.getMonthlyReport();
      else if (type === 'products') data = await api.getProductsReport();
      else if (type === 'clients') data = await api.getClientsReport();
      setReportData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    { id: 'sales', label: 'Reporte General', icon: BarChart3 },
    { id: 'monthly', label: 'Ventas Mensuales', icon: FileText },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'clients', label: 'Clientes', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 dark:bg-primary-500/10 rounded-lg">
            <BarChart3 className="w-6 h-6 text-primary-500 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Reportes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Consulta y genera reportes de tu negocio</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => loadReport(report.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeReport === report.id
                ? 'border-primary-300 dark:border-primary-500/50 bg-primary-50 dark:bg-primary-500/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-200 dark:hover:border-primary-500/30 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <report.icon className={`w-8 h-8 mb-2 ${activeReport === report.id ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
            <p className="font-medium text-gray-900 dark:text-white">{report.label}</p>
          </button>
        ))}
      </div>

      {activeReport && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{reports.find((r) => r.id === activeReport)?.label}</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="w-5 h-5 border-2 border-primary-500 dark:border-primary-400 border-t-transparent rounded-full animate-spin" />
              <span>Cargando...</span>
            </div>
          ) : reportData ? (
            <div>
              {activeReport === 'sales' && reportData.resumen && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Ventas</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">S/ {Number(reportData.resumen.totalVentas).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">IGV</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">S/ {Number(reportData.resumen.totalIGV).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Comprobantes</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{reportData.resumen.cantidadComprobantes}</p>
                    </div>
                  </div>
                </div>
              )}
              {activeReport === 'monthly' && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{reportData.mes}</p>
                  <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">S/ {Number(reportData.totalVentas).toFixed(2)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{reportData.cantidadComprobantes} comprobantes</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Selecciona un reporte</p>
          )}
        </div>
      )}
    </div>
  );
}
