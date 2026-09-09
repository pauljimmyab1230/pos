import { create } from 'zustand';
import { api } from '../services/api';

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
}

interface ClientsState {
  clients: Client[];
  loading: boolean;
  error: string | null;
  loadClients: () => Promise<void>;
  createClient: (data: Partial<Client>) => Promise<Client>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  searchClient: (doc: string) => Promise<Client | null>;
}

export const useClientsStore = create<ClientsState>((set) => ({
  clients: [],
  loading: false,
  error: null,

  loadClients: async () => {
    set({ loading: true, error: null });
    try {
      const data = (await api.getClients()) as Client[];
      set({ clients: data, loading: false });
    } catch (error) {
      set({ error: 'Error al cargar clientes', loading: false });
      throw error;
    }
  },

  createClient: async (data) => {
    try {
      const newClient = (await api.createClient(data)) as Client;
      set((state) => ({ clients: [...state.clients, newClient] }));
      return newClient;
    } catch (error) {
      set({ error: 'Error al crear cliente' });
      throw error;
    }
  },

  updateClient: async (id, data) => {
    try {
      await api.updateClient(id, data);
      set((state) => ({
        clients: state.clients.map((c) =>
          c.id === id ? { ...c, ...data } : c
        ),
      }));
    } catch (error) {
      set({ error: 'Error al actualizar cliente' });
      throw error;
    }
  },

  deleteClient: async (id) => {
    try {
      await api.deleteClient(id);
      set((state) => ({
        clients: state.clients.filter((c) => c.id !== id),
      }));
    } catch (error) {
      set({ error: 'Error al eliminar cliente' });
      throw error;
    }
  },

  searchClient: async (doc) => {
    try {
      const client = (await api.searchClient(doc)) as Client;
      return client;
    } catch (error) {
      return null;
    }
  },
}));
