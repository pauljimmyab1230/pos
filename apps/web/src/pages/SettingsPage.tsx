import { useEffect, useState } from 'react';
import { useAuthStore, Business } from '../stores/auth.store';
import { api } from '../services/api';
import { useToastStore } from '../stores/toast.store';
import { useThemeStore } from '../stores/theme.store';
import { ListSkeleton } from '../components/Skeleton';
import {
  Building2,
  CreditCard,
  Printer,
  Camera,
  User,
  Plus,
  Users,
  Search,
  XCircle,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';

interface BankAccount {
  id: string;
  banco: string;
  tipoCuenta: string;
  moneda: string;
  numeroCuenta: string;
  cci?: string;
  visiblePDF: boolean;
}

interface UserData {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  businessId?: string;
}

export default function SettingsPage() {
  const { user, business, updateBusiness } = useAuthStore();
  const showToast = useToastStore((s) => s.showToast);
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [bankForm, setBankForm] = useState({
    banco: '',
    tipoCuenta: '',
    moneda: 'PEN',
    numeroCuenta: '',
    cci: '',
  });
  const [userForm, setUserForm] = useState({
    nombre: '',
    email: '',
    rol: 'Vendedor',
    password: '',
  });

  const [formData, setFormData] = useState({
    razonSocial: business?.razonSocial || '',
    nombreComercial: business?.nombreComercial || '',
    direccion: business?.direccion || '',
    telefono: business?.telefono || '',
    email: business?.email || '',
    igv: business?.igv?.toString() || '18',
    giroComercial: (business as any)?.giroComercial || '',
    logo: (business as any)?.logo || '',
    mensajePdf: (business as any)?.mensajePdf || '',
  });

  const [printingConfig, setPrintingConfig] = useState({
    ticketera: (business as any)?.ticketera || '58mm',
    disenoTicket: (business as any)?.disenoTicket || 'A',
    disenoPdf: (business as any)?.disenoPdf || 'A',
    conexionImpresora: (business as any)?.conexionImpresora || 'USB',
  });

  useEffect(() => {
    if (activeTab === 'banks') loadBanks();
    if (activeTab === 'users') loadUsers();
  }, [activeTab]);

  const loadBanks = async () => {
    setLoading(true);
    try {
      const data = (await api.getBanks()) as BankAccount[];
      setBanks(data);
    } catch (error) {
      showToast('Error al cargar cuentas bancarias', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = (await api.getUsers()) as UserData[];
      setUsers(data);
    } catch (error) {
      showToast('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetBankForm = () => {
    setBankForm({
      banco: '',
      tipoCuenta: '',
      moneda: 'PEN',
      numeroCuenta: '',
      cci: '',
    });
    setEditingBank(null);
  };

  const handleEditBank = (bank: BankAccount) => {
    setEditingBank(bank);
    setBankForm({
      banco: bank.banco,
      tipoCuenta: bank.tipoCuenta,
      moneda: bank.moneda || 'PEN',
      numeroCuenta: bank.numeroCuenta,
      cci: bank.cci || '',
    });
    setShowBankModal(true);
  };

  const handleSaveBank = async () => {
    try {
      if (editingBank) {
        await api.updateBank(editingBank.id, bankForm);
        showToast('Cuenta bancaria actualizada', 'success');
      } else {
        await api.createBank(bankForm);
        showToast('Cuenta bancaria agregada', 'success');
      }
      setShowBankModal(false);
      resetBankForm();
      loadBanks();
    } catch (error) {
      showToast('Error al guardar cuenta', 'error');
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm('¿Eliminar esta cuenta bancaria?')) return;
    try {
      await api.deleteBank(id);
      showToast('Cuenta bancaria eliminada', 'success');
      loadBanks();
    } catch (error) {
      showToast('Error al eliminar cuenta', 'error');
    }
  };

  const resetUserForm = () => {
    setUserForm({
      nombre: '',
      email: '',
      rol: 'Vendedor',
      password: '',
    });
    setEditingUser(null);
  };

  const handleEditUser = (u: UserData) => {
    setEditingUser(u);
    setUserForm({
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      password: '',
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          nombre: userForm.nombre,
          rol: userForm.rol,
        });
        showToast('Usuario actualizado', 'success');
      } else {
        if (!userForm.password || userForm.password.length < 8) {
          showToast('La contraseña debe tener al menos 8 caracteres', 'error');
          return;
        }
        if (!/[A-Z]/.test(userForm.password)) {
          showToast('La contraseña debe tener al menos 1 mayúscula', 'error');
          return;
        }
        await api.createUser(userForm);
        showToast('Usuario creado', 'success');
      }
      setShowUserModal(false);
      resetUserForm();
      loadUsers();
    } catch (error) {
      showToast('Error al guardar usuario', 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await api.deleteUser(id);
      showToast('Usuario eliminado', 'success');
      loadUsers();
    } catch (error) {
      showToast('Error al eliminar usuario', 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = (await api.updateBusiness({
        ...formData,
        igv: parseFloat(formData.igv),
      })) as Business;
      updateBusiness(updated);
      showToast('Perfil actualizado correctamente', 'success');
    } catch (error) {
      showToast('Error al actualizar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrinting = async () => {
    try {
      const updated = (await api.updateBusiness(printingConfig)) as Business;
      updateBusiness(updated);
      showToast('Configuración de impresión guardada', 'success');
    } catch (error) {
      showToast('Error al guardar configuración', 'error');
    }
  };

  return (
    <div className="space-y-6">

      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Ajustes</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
        {[
          { id: 'profile', label: 'Mi Perfil', icon: User },
          { id: 'appearance', label: 'Apariencia', icon: Palette },
          { id: 'banks', label: 'Cuentas Bancarias', icon: CreditCard },
          { id: 'printing', label: 'Impresión', icon: Printer },
          { id: 'users', label: 'Usuarios', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* MI PERFIL */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Logo del negocio</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
              <h3 className="font-medium text-gray-900 dark:text-white">Negocio</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">RUC</label>
                <input
                  type="text"
                  value={business?.ruc || ''}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Razón Social</label>
                <input
                  type="text"
                  value={formData.razonSocial}
                  onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  value={formData.nombreComercial}
                  onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Celular</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">IGV (%)</label>
                  <input
                    type="number"
                    value={formData.igv}
                    onChange={(e) => setFormData({ ...formData, igv: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Giro Comercial</label>
                  <input
                    type="text"
                    value={formData.giroComercial}
                    onChange={(e) => setFormData({ ...formData, giroComercial: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Ej: TELECOMUNICACIONES"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
              <h3 className="font-medium text-gray-900 dark:text-white">Usuario Admin</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Nombre Usuario</label>
                <input
                  type="text"
                  value={user?.nombre || ''}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Correo Usuario</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Rol</label>
                <input
                  type="text"
                  value={user?.rol || ''}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
              <h3 className="font-medium text-gray-900 dark:text-white">Mensaje para Comprobantes</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Este mensaje aparecerá en la parte inferior de tus comprobantes PDF.
            </p>
            <textarea
              value={formData.mensajePdf}
              onChange={(e) => setFormData({ ...formData, mensajePdf: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              rows={4}
              placeholder="Ej: BBVA: Número de cuenta: 0011-0202-0100065779 | CCI: 011-202-000100065779-99"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Actualizar mi perfil'}
            </button>
          </div>
        </form>
      )}

      {/* APARIENCIA */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Apariencia</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Personaliza el aspecto visual del sistema</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selecciona el tema que prefieras para el sistema. Tu elección se guardará automáticamente.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode */}
                <button
                  onClick={() => setTheme('light')}
                  className={`relative p-6 rounded-2xl border-2 transition-all duration-200 ${
                    theme === 'light'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-lg shadow-primary-500/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 ${
                      theme === 'light' 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                    }`}>
                      <Sun className="w-8 h-8" />
                    </div>
                    <h4 className={`font-semibold mb-1 ${
                      theme === 'light' ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      Modo Claro
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Interfaz brillante y limpia
                    </p>
                  </div>
                  {theme === 'light' && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Dark Mode */}
                <button
                  onClick={() => setTheme('dark')}
                  className={`relative p-6 rounded-2xl border-2 transition-all duration-200 ${
                    theme === 'dark'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-lg shadow-primary-500/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 ${
                      theme === 'dark' 
                        ? 'bg-primary-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                    }`}>
                      <Moon className="w-8 h-8" />
                    </div>
                    <h4 className={`font-semibold mb-1 ${
                      theme === 'dark' ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      Modo Oscuro
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Reduce la fatiga visual
                    </p>
                  </div>
                  {theme === 'dark' && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
              <h3 className="font-medium text-gray-900 dark:text-white">Vista Previa</h3>
            </div>
            
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-primary-500/20' : 'bg-primary-100'
                }`}>
                  <User className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
                  }`} />
                </div>
                <div>
                  <p className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user?.nombre || 'Usuario'}
                  </p>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {user?.rol || 'Rol'}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <div className={`h-2 w-12 rounded mb-2 ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                    }`}></div>
                    <div className={`h-2 w-8 rounded ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                    }`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUENTAS BANCARIAS */}
      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Cuentas para tus PDF</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Se mostrarán en el Diseño B de tus comprobantes.</p>
                <span className="inline-block mt-2 px-3 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                  Hasta 4 cuentas bancarias
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <ListSkeleton count={3} />
          ) : banks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">No hay cuentas bancarias registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {banks.map((bank) => (
                <div key={bank.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-red-500 dark:text-red-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{bank.banco}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{bank.tipoCuenta}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg">
                        {bank.moneda === 'PEN' ? 'S/ PEN' : '$ USD'}
                      </span>
                      <button
                        onClick={() => handleEditBank(bank)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteBank(bank.id)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">N° Cuenta</span>
                      <span className="font-medium text-gray-900 dark:text-white">{bank.numeroCuenta}</span>
                    </div>
                    {bank.cci && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">CCI</span>
                        <span className="font-medium text-gray-900 dark:text-white">{bank.cci}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowBankModal(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 flex items-center justify-center z-40"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Modal Nueva Cuenta Bancaria */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {editingBank ? 'Editar cuenta bancaria' : 'Nueva cuenta bancaria'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Esta cuenta se mostrará en los comprobantes PDF (Opción B)
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Banco <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={bankForm.banco}
                  onChange={(e) => setBankForm({ ...bankForm, banco: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ej: BCP, Interbank, BBVA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de cuenta <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <select
                  value={bankForm.tipoCuenta}
                  onChange={(e) => setBankForm({ ...bankForm, tipoCuenta: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Seleccionar tipo de cuenta</option>
                  <option value="Cuenta Corriente">Cuenta Corriente</option>
                  <option value="Cuenta de Ahorros">Cuenta de Ahorros</option>
                  <option value="Cuenta Sueldo">Cuenta Sueldo</option>
                  <option value="Depósito a Plazo Fijo">Depósito a Plazo Fijo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Moneda</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBankForm({ ...bankForm, moneda: 'PEN' })}
                    className={`py-3 rounded-lg font-medium transition-colors ${
                      bankForm.moneda === 'PEN'
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-500/50'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-transparent'
                    }`}
                  >
                    S/ PEN
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankForm({ ...bankForm, moneda: 'USD' })}
                    className={`py-3 rounded-lg font-medium transition-colors ${
                      bankForm.moneda === 'USD'
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-500/50'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-transparent'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Número de cuenta <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={bankForm.numeroCuenta}
                  onChange={(e) => setBankForm({ ...bankForm, numeroCuenta: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="191-123-XXXX-XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CCI (opcional)
                </label>
                <input
                  type="text"
                  value={bankForm.cci}
                  onChange={(e) => setBankForm({ ...bankForm, cci: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Código interbancario"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowBankModal(false);
                  resetBankForm();
                }}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBank}
                disabled={!bankForm.banco || !bankForm.tipoCuenta || !bankForm.numeroCuenta}
                className="flex-1 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50"
              >
                {editingBank ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPRESIÓN */}
      {activeTab === 'printing' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center">
                <Printer className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Centro de impresión</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Personaliza tickets, PDFs y conexión de impresora.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Conexión</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Elige cómo se conectará tu impresora.</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 border-2 border-primary-500 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">USB genérico</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ideal para POS Android con cable OTG.</p>
                  </div>
                </div>
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            <button className="w-full py-3 border-2 border-primary-500 text-primary-500 rounded-xl font-medium hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors mb-4">
              Imprimir ticket de prueba
            </button>

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">0 impresoras detectadas</span>
              <button className="flex items-center gap-1 text-sm text-primary-500 font-medium hover:text-primary-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Buscar
              </button>
            </div>
            <select className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="">Seleccionar impresora USB</option>
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Ticketera</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configura el tamaño del ticket.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPrintingConfig({ ...printingConfig, ticketera: '58mm' })}
                className={`py-3 rounded-xl font-medium transition-colors ${
                  printingConfig.ticketera === '58mm'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                58 mm
              </button>
              <button
                onClick={() => setPrintingConfig({ ...printingConfig, ticketera: '80mm' })}
                className={`py-3 rounded-xl font-medium transition-colors ${
                  printingConfig.ticketera === '80mm'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                80 mm
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Diseño de ticket</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Selecciona cómo se imprimirá el comprobante físico.</p>
              </div>
            </div>

            <div
              onClick={() => setPrintingConfig({ ...printingConfig, disenoTicket: 'A' })}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                printingConfig.disenoTicket === 'A'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      printingConfig.disenoTicket === 'A' ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${
                        printingConfig.disenoTicket === 'A' ? 'text-primary-500 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">Diseño A</span>
                      <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-full">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Más visual, ordenado y fácil de leer.</p>
                  </div>
                </div>
                {printingConfig.disenoTicket === 'A' && (
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Comprobantes PDF</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Diseño visual para boletas, facturas, notas y cotizaciones.</p>
              </div>
            </div>

            <div
              onClick={() => setPrintingConfig({ ...printingConfig, disenoPdf: 'A' })}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                printingConfig.disenoPdf === 'A'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      printingConfig.disenoPdf === 'A' ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${
                        printingConfig.disenoPdf === 'A' ? 'text-primary-500 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">PDF Diseño A</span>
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full">
                        Simple
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Limpio, directo y compacto para envío y lectura rápida.</p>
                  </div>
                </div>
                {printingConfig.disenoPdf === 'A' && (
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSavePrinting}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              Guardar configuración
            </button>
          </div>
        </div>
      )}

      {/* USUARIOS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Buscar usuario..."
            />
          </div>

          {loading ? (
            <ListSkeleton count={3} />
          ) : (
            <div className="space-y-3">
              {users
                .filter(
                  (u) =>
                    u.nombre?.toLowerCase().includes(searchUser.toLowerCase()) ||
                    u.email?.toLowerCase().includes(searchUser.toLowerCase())
                )
                .map((u) => (
                  <div key={u.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-red-500 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{u.nombre}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              u.rol === 'Admin' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {u.rol}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400">
                            Activo
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        <button
                          onClick={() => handleEditUser(u)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg"
                          title="Editar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                          title="Eliminar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <button
            onClick={() => {
              resetUserForm();
              setShowUserModal(true);
            }}
            className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 flex items-center justify-center z-40"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </button>
        </div>
      )}

      {/* Modal Nuevo Usuario */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  resetUserForm();
                }}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.nombre}
                  onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Nombre del usuario"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Correo <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="correo@ejemplo.com"
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                <select
                  value={userForm.rol}
                  onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="Vendedor">Genérico</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contraseña <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <div className="mt-2 space-y-1">
                    <p
                      className={`text-sm flex items-center gap-2 ${
                        userForm.password.length >= 8 ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs ${
                          userForm.password.length >= 8
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {userForm.password.length >= 8 && '✓'}
                      </span>
                      Mínimo 8 caracteres
                    </p>
                    <p
                      className={`text-sm flex items-center gap-2 ${
                        /[A-Z]/.test(userForm.password) ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-xs ${
                          /[A-Z]/.test(userForm.password)
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {/[A-Z]/.test(userForm.password) && '✓'}
                      </span>
                      Al menos 1 mayúscula
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSaveUser}
                disabled={!userForm.nombre || !userForm.email || (!editingUser && !userForm.password)}
                className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingUser ? 'Actualizar' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
