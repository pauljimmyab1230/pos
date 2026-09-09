import { create } from 'zustand';
import { api } from '../services/api';

export interface QuoteItem {
  id?: string;
  productId: string;
  cantidad: number;
  precioUnit: number;
  subtotal?: number;
  descuento?: number;
  product?: {
    id: string;
    nombre: string;
    precioConIGV: number;
    tipo: string;
  };
}

export interface Quote {
  id: string;
  serie: string;
  correlativo: number;
  fechaEmision: string;
  moneda: string;
  estado: string;
  clienteId?: string;
  cliente?: {
    id: string;
    tipoDoc: string;
    numeroDoc: string;
    nombres?: string;
    apellidos?: string;
    razonSocial?: string;
    direccion?: string;
  };
  subtotal: number;
  igv: number;
  total: number;
  metodoPago: string;
  pagos?: string;
  observacion?: string;
  direccionEnvio?: string;
  origenCompra?: string;
  items?: QuoteItem[];
}

interface QuotesState {
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  loadQuotes: () => Promise<void>;
  createQuote: (data: any) => Promise<Quote>;
  updateQuote: (id: string, data: any) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  convertQuote: (id: string) => Promise<void>;
}

export const useQuotesStore = create<QuotesState>((set) => ({
  quotes: [],
  loading: false,
  error: null,

  loadQuotes: async () => {
    set({ loading: true, error: null });
    try {
      const data = (await api.getQuotes()) as Quote[];
      set({ quotes: data, loading: false });
    } catch (error) {
      set({ error: 'Error al cargar cotizaciones', loading: false });
      throw error;
    }
  },

  createQuote: async (data) => {
    try {
      const newQuote = (await api.createQuote(data)) as Quote;
      set((state) => ({ quotes: [newQuote, ...state.quotes] }));
      return newQuote;
    } catch (error) {
      set({ error: 'Error al crear cotización' });
      throw error;
    }
  },

  updateQuote: async (id, data) => {
    try {
      await api.updateQuote(id, data);
      set((state) => ({
        quotes: state.quotes.map((q) =>
          q.id === id ? { ...q, ...data } : q
        ),
      }));
    } catch (error) {
      set({ error: 'Error al actualizar cotización' });
      throw error;
    }
  },

  deleteQuote: async (id) => {
    try {
      await api.deleteQuote(id);
      set((state) => ({
        quotes: state.quotes.filter((q) => q.id !== id),
      }));
    } catch (error) {
      set({ error: 'Error al eliminar cotización' });
      throw error;
    }
  },

  convertQuote: async (id) => {
    try {
      await api.convertQuote(id);
      set((state) => ({
        quotes: state.quotes.map((q) =>
          q.id === id ? { ...q, estado: 'Convertida' } : q
        ),
      }));
    } catch (error) {
      set({ error: 'Error al convertir cotización' });
      throw error;
    }
  },
}));
