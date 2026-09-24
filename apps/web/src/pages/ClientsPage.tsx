import { useEffect, useState, useCallback } from 'react';
import { useClientsStore, Client } from '../stores/clients.store';
import { useToastStore } from '../stores/toast.store';
import { ListSkeleton, GridSkeleton } from '../components/Skeleton';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  Phone,
  Mail,
  StickyNote,
  X,
} from 'lucide-react';

export default function ClientsPage() {
  const { 
    clients, loading, creating, updating, 
    pagination, search, currentPage,
    loadClients, createClient, updateClient, deleteClient,
    setPage 
  } = useClientsStore();
  const showToast = useToastStore((s) => s.showToast);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('clients-view-mode') as 'list' | 'grid') || 'list';
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(search);
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
    notas: '',
  });

  useEffect(() => {
    loadClients(1, 50, '').catch(() => showToast('Error al cargar clientes', 'error'));
  }, []);

  const handleSearch = useCallback(() => {
    setPage(1);
    loadClients(1, 50, localSearch).catch(() => showToast('Error al buscar clientes', 'error'));
  }, [localSearch]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    if (value === '') {
      setPage(1);
      loadClients(1, 50, '').catch(() => showToast('Error al buscar clientes', 'error'));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadClients(newPage, 50, search).catch(() => showToast('Error al cargar clientes', 'error'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        await updateClient(editingClient.id, form);
        showToast('Cliente actualizado correctamente', 'success');
      } else {
        await createClient(form);
        showToast('Cliente creado correctamente', 'success');
      }
      setShowForm(false);
      setEditingClient(null);
      resetForm();
      loadClients(currentPage, 50, search);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar el cliente';
      showToast(message, 'error');
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
      fechaNacimiento: client.fechaNacimiento ? formatDateForInput(client.fechaNacimiento) : '',
      notas: client.notas || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    setDeletingId(id);
    try {
      await deleteClient(id);
      showToast('Cliente eliminado correctamente', 'success');
      if (clients.length === 1 && currentPage > 1) {
        handlePageChange(currentPage - 1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar el cliente';
      showToast(message, 'error');
    } finally {
      setDeletingId(null);
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
      notas: '',
    });
  };

  const formatDateForInput = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const getClientName = (client: Client) => {
    if (client.razonSocial) return client.razonSocial;
    return `${client.nombres || ''} ${client.apellidos || ''}`.trim() || 'Sin nombre';
  };

  const getInitials = (client: Client) => {
    if (client.razonSocial) return client.razonSocial.substring(0, 2).toUpperCase();
    const n = client.nombres?.charAt(0) || '';
    const a = client.apellidos?.charAt(0) || '';
    return `${n}${a}`.toUpperCase() || 'CL';
  };

  const isProcessing = creating || updating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {pagination.total} cliente{pagination.total !== 1 ? 's' : ''} registrado{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const newMode = viewMode === 'list' ? 'grid' : 'list';
              setViewMode(newMode);
              localStorage.setItem('clients-view-mode', newMode);
            }}
            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            {viewMode === 'list' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </button>
          <button
            onClick={() => { resetForm(); setEditingClient(null); setShowForm(true); }}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
          >
            <Plus className="w-5 h-5" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
          placeholder="Buscar por nombre, documento, teléfono o email... (Enter para buscar)"
        />
        {localSearch && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Clients List */}
      {loading ? (
        viewMode === 'list' ? <ListSkeleton count={5} /> : <GridSkeleton count={8} />
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {clients.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">
                {search ? 'No se encontraron clientes con esa búsqueda' : 'No se encontraron clientes'}
              </p>
            </div>
          ) : (
            clients.map((client) => (
              <div key={client.id} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-200 group ${!client.activo ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
                    <span className="text-lg font-bold text-white">{getInitials(client)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{getClientName(client)}</h3>
                      {!client.activo && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">Inactivo</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <FileText className="w-3.5 h-3.5" />
                        {client.tipoDoc}: {client.numeroDoc}
                      </span>
                      {client.telefono && (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Phone className="w-3.5 h-3.5" />
                          {client.telefono}
                        </span>
                      )}
                      {client.email && (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Mail className="w-3.5 h-3.5" />
                          {client.email}
                        </span>
                      )}
                      {client.notas && (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <StickyNote className="w-3.5 h-3.5" />
                          {client.notas.substring(0, 30)}{client.notas.length > 30 ? '...' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleEdit(client)} 
                      disabled={deletingId === client.id}
                      className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(client.id)} 
                      disabled={deletingId === client.id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === client.id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {clients.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">
                {search ? 'No se encontraron clientes con esa búsqueda' : 'No se encontraron clientes'}
              </p>
            </div>
          ) : (
            clients.map((client) => (
              <div key={client.id} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-200 group ${!client.activo ? 'opacity-60' : ''}`}>
                <div className="bg-gradient-to-br from-primary-400 to-primary-600 p-4">
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-xl font-bold text-white">{getInitials(client)}</span>
                    </div>
                    <span className="text-white text-xs bg-white/20 px-2 py-1 rounded-full">{client.tipoDoc}</span>
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm text-center uppercase line-clamp-2 min-h-[40px]">
                    {getClientName(client)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">{client.numeroDoc}</p>
                  {client.telefono && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">{client.telefono}</p>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button 
                      onClick={() => handleEdit(client)} 
                      disabled={deletingId === client.id}
                      className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(client.id)} 
                      disabled={deletingId === client.id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === client.id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {((currentPage - 1) * pagination.limit) + 1} - {Math.min(currentPage * pagination.limit, pagination.total)} de {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${currentPage === page ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              >
                {page}
              </button>
            ))}
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === pagination.totalPages}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => { resetForm(); setEditingClient(null); setShowForm(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 flex items-center justify-center z-40 sm:hidden"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingClient ? 'Editar cliente' : 'Nuevo cliente'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Documento</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo <span className="text-red-500">*</span></label>
                    <select value={form.tipoDoc} onChange={(e) => setForm({ ...form, tipoDoc: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" required>
                      <option value="DNI">DNI</option>
                      <option value="RUC">RUC</option>
                      <option value="CE">Carnet de extranjería</option>
                      <option value="PTP">PTP</option>
                      <option value="Pasaporte">Pasaporte</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número <span className="text-red-500">*</span></label>
                    <input type="text" value={form.numeroDoc} onChange={(e) => setForm({ ...form, numeroDoc: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" placeholder={form.tipoDoc === 'DNI' ? '8 dígitos' : form.tipoDoc === 'RUC' ? '11 dígitos' : 'Documento'} required />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Datos principales</h3>
                </div>

                {form.tipoDoc === 'RUC' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razón social</label>
                      <input type="text" value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" placeholder="Se completará automáticamente" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                      <input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" placeholder="Ingrese la dirección" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombres <span className="text-red-500">*</span></label>
                      <input type="text" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" placeholder="Ingrese los nombres" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Apellidos</label>
                      <input type="text" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" placeholder="Ingrese los apellidos" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                      <input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" placeholder="Ingrese la dirección" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de nacimiento</label>
                      <input type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Datos de contacto</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Celular</label>
                    <input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" placeholder="Ejemplo: 987654321" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo electrónico</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" placeholder="cliente@correo.com" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Notas</h3>
                </div>
                <div>
                  <textarea 
                    value={form.notas} 
                    onChange={(e) => setForm({ ...form, notas: e.target.value })} 
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none" 
                    placeholder="Observaciones adicionales del cliente..." 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => { setShowForm(false); setEditingClient(null); }} 
                  disabled={isProcessing}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {creating ? 'Registrando...' : updating ? 'Actualizando...' : (editingClient ? 'Actualizar' : 'Registrar cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
