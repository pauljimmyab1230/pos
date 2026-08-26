import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plus, Search, Edit2, Trash2, Check, XCircle, ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';

interface Client {
  id: string;
  tipoDoc: string;
  numeroDoc: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('clients-view-mode') as 'list' | 'grid') || 'list';
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [form, setForm] = useState({
    tipoDoc: 'DNI',
    numeroDoc: '',
    nombres: '',
    apellidos: '',
    razonSocial: '',
    direccion: '',
    telefono: '',
    email: '',
    fechaNacimiento: '',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type }]);
    setTimeout(() => {
      setToasts(toasts.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await api.getClients() as Client[];
      setClients(data);
    } catch (error) {
      console.error(error);
      showToast('Error al cargar clientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.nombres?.toLowerCase().includes(search.toLowerCase()) ||
      c.apellidos?.toLowerCase().includes(search.toLowerCase()) ||
      c.razonSocial?.toLowerCase().includes(search.toLowerCase()) ||
      c.numeroDoc?.includes(search) ||
      c.telefono?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación de campos obligatorios
    if (!form.numeroDoc.trim()) {
      showToast('El número de documento es obligatorio', 'error');
      return;
    }
    if (form.tipoDoc === 'RUC' && !form.razonSocial.trim()) {
      showToast('La razón social es obligatoria para RUC', 'error');
      return;
    }
    if (form.tipoDoc !== 'RUC' && !form.nombres.trim()) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }
    
    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, form);
        showToast('Cliente actualizado correctamente', 'success');
      } else {
        await api.createClient(form);
        showToast('Cliente creado correctamente', 'success');
      }

      setShowForm(false);
      setEditingClient(null);
      resetForm();
      loadClients();
    } catch (error) {
      console.error(error);
      showToast('Error al guardar el cliente', 'error');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      tipoDoc: client.tipoDoc,
      numeroDoc: client.numeroDoc,
      nombres: client.nombres || '',
      apellidos: client.apellidos || '',
      razonSocial: client.razonSocial || '',
      direccion: client.direccion || '',
      telefono: client.telefono || '',
      email: client.email || '',
      fechaNacimiento: client.fechaNacimiento ? client.fechaNacimiento.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await api.deleteClient(id);
      showToast('Cliente eliminado correctamente', 'success');
      loadClients();
    } catch (error) {
      console.error(error);
      showToast('Error al eliminar el cliente', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      tipoDoc: 'DNI',
      numeroDoc: '',
      nombres: '',
      apellidos: '',
      razonSocial: '',
      direccion: '',
      telefono: '',
      email: '',
      fechaNacimiento: '',
    });
  };

  const getClientName = (client: Client) => {
    if (client.razonSocial) return client.razonSocial;
    return `${client.nombres || ''} ${client.apellidos || ''}`.trim() || 'Sin nombre';
  };

  const getInitials = (client: Client) => {
    if (client.razonSocial) {
      return client.razonSocial.substring(0, 2).toUpperCase();
    }
    const n = client.nombres?.charAt(0) || '';
    const a = client.apellidos?.charAt(0) || '';
    return `${n}${a}`.toUpperCase() || 'CL';
  };

  return (
    <div className="space-y-4">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Lista de clientes</h1>
        <button
          onClick={() => {
            const newMode = viewMode === 'list' ? 'grid' : 'list';
            setViewMode(newMode);
            localStorage.setItem('clients-view-mode', newMode);
          }}
          className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
        >
          {viewMode === 'list' ? (
            <Grid className="w-5 h-5" />
          ) : (
            <List className="w-5 h-5" />
          )}
        </button>
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
          placeholder="Buscar clientes por nombre, documento, teléfono o email"
        />
      </div>

      {/* Clients List */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : paginatedClients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron clientes
            </div>
          ) : (
            paginatedClients.map((client) => (
              <div
                key={client.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-primary-600">
                      {getInitials(client)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      {getClientName(client)}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">
                        {client.tipoDoc}: {client.numeroDoc}
                      </span>
                      {client.telefono && (
                        <span className="text-sm text-gray-400">|</span>
                      )}
                      {client.telefono && (
                        <span className="text-sm text-gray-500">{client.telefono}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {loading ? (
            <div className="col-span-2 text-center py-8 text-gray-500">Cargando...</div>
          ) : paginatedClients.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No se encontraron clientes
            </div>
          ) : (
            paginatedClients.map((client) => (
              <div
                key={client.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Header with gradient */}
                <div className="bg-gradient-to-br from-primary-400 to-primary-600 p-4">
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-xl font-bold text-white">
                        {getInitials(client)}
                      </span>
                    </div>
                    <span className="text-white text-xs bg-white/20 px-2 py-1 rounded-full">
                      {client.tipoDoc}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm text-center uppercase line-clamp-2 min-h-[40px]">
                    {getClientName(client)}
                  </h3>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    {client.numeroDoc}
                  </p>
                  {client.telefono && (
                    <p className="text-xs text-gray-400 text-center mt-1">
                      {client.telefono}
                    </p>
                  )}
                  {/* Actions */}
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
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
            Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredClients.length)} de {filteredClients.length}
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

      {/* FAB Button */}
      <button
        onClick={() => {
          resetForm();
          setEditingClient(null);
          setShowForm(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal Form - Estilo Kallpa */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {editingClient ? 'Editar cliente' : 'Nuevo cliente'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Documento */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900">Documento</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                    <select
                      value={form.tipoDoc}
                      onChange={(e) => setForm({ ...form, tipoDoc: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      required
                    >
                      <option value="DNI">DNI</option>
                      <option value="RUC">RUC</option>
                      <option value="CE">Carnet de extranjería</option>
                      <option value="PTP">PTP</option>
                      <option value="Pasaporte">Pasaporte</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.numeroDoc}
                      onChange={(e) => setForm({ ...form, numeroDoc: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder={
                        form.tipoDoc === 'DNI' ? '8 dígitos' :
                        form.tipoDoc === 'RUC' ? '11 dígitos' :
                        'Documento'
                      }
                      required
                    />
                  </div>
                </div>
                
                {form.tipoDoc === 'DNI' && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <span className="w-5 h-5 bg-red-200 rounded-full flex items-center justify-center text-xs">i</span>
                      Los datos se buscarán automáticamente al completar el DNI.
                    </p>
                  </div>
                )}
                
                {form.tipoDoc === 'RUC' && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <span className="w-5 h-5 bg-red-200 rounded-full flex items-center justify-center text-xs">i</span>
                      La razón social y dirección se buscarán automáticamente al completar el RUC.
                    </p>
                  </div>
                )}
              </div>

              {/* Datos principales */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900">Datos principales</h3>
                </div>
                
                {form.tipoDoc === 'RUC' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Razón social</label>
                      <input
                        type="text"
                        value={form.razonSocial}
                        onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="Se completará automáticamente"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                      <input
                        type="text"
                        value={form.direccion}
                        onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="Ingrese la dirección"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={form.nombres}
                        onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="Ingrese los nombres"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                      <input
                        type="text"
                        value={form.apellidos}
                        onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="Ingrese los apellidos"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                      <input
                        type="text"
                        value={form.direccion}
                        onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        placeholder="Ingrese la dirección"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                      <input
                        type="date"
                        value={form.fechaNacimiento}
                        onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Datos de contacto */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900">Datos de contacto</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Ejemplo: 987654321"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="cliente@correo.com"
                    />
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingClient(null); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
                >
                  {editingClient ? 'Actualizar' : 'Registrar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
