import { create } from 'zustand';
import { api } from '../services/api';

// ==================== TIPOS ====================
export interface Client {
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
  notas?: string;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ClientFormData {
  tipoDoc: string;
  numeroDoc: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: string;
  notas?: string;
}

interface ClientsResponse {
  data: Client[];
  pagination: PaginationInfo;
}

// ==================== ESTADO ====================
interface ClientsState {
  clients: Client[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
  pagination: PaginationInfo;
  search: string;
  currentPage: number;
  
  // Acciones
  loadClients: (page?: number, limit?: number, search?: string) => Promise<void>;
  createClient: (data: ClientFormData) => Promise<Client>;
  updateClient: (id: string, data: Partial<ClientFormData>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  searchClient: (doc: string) => Promise<Client | null>;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  clearError: () => void;
}

// ==================== STORE ====================
export const useClientsStore = create<ClientsState>((set) => ({
  clients: [],
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },
  search: '',
  currentPage: 1,

  loadClients: async (page = 1, limit = 50, search = '') => {
    set({ loading: true, error: null });
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (search) params.search = search;

      const response = await api.getClients(params) as ClientsResponse;
      set({ 
        clients: response.data, 
        pagination: response.pagination,
        currentPage: page,
        loading: false 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar clientes';
      set({ error: message, loading: false });
      throw error;
    }
  },

  createClient: async (data) => {
    set({ creating: true, error: null });
    try {
      const newClient = await api.createClient(data) as Client;
      set((state) => ({ 
        clients: [newClient, ...state.clients],
        creating: false,
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      }));
      return newClient;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear cliente';
      set({ error: message, creating: false });
      throw error;
    }
  },

  updateClient: async (id, data) => {
    set({ updating: true, error: null });
    try {
      const updatedClient = await api.updateClient(id, data) as Client;
      set((state) => ({
        clients: state.clients.map((c) =>
          c.id === id ? updatedClient : c
        ),
        updating: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar cliente';
      set({ error: message, updating: false });
      throw error;
    }
  },

  deleteClient: async (id) => {
    set({ deleting: true, error: null });
    try {
      await api.deleteClient(id);
      set((state) => ({
        clients: state.clients.filter((c) => c.id !== id),
        deleting: false,
        pagination: {
          ...state.pagination,
          total: state.pagination.total - 1,
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar cliente';
      set({ error: message, deleting: false });
      throw error;
    }
  },

  searchClient: async (doc) => {
    try {
      const client = await api.searchClient(doc) as Client;
      return client;
    } catch (error) {
      return null;
    }
  },

  setSearch: (search) => set({ search }),
  setPage: (page) => set({ currentPage: page }),
  clearError: () => set({ error: null }),
}));
