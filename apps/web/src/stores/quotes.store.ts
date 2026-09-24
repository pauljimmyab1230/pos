import { create } from 'zustand';
import { api } from '../services/api';
import { Quote, QuoteItem, PaginationInfo } from '../../../packages/shared/types';

// Re-exportar tipos para compatibilidad
export type { Quote, QuoteItem };

interface QuotesState {
  quotes: Quote[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  converting: boolean;
  error: string | null;
  pagination: PaginationInfo;
  
  loadQuotes: (page?: number, limit?: number) => Promise<void>;
  createQuote: (data: any) => Promise<Quote>;
  updateQuote: (id: string, data: any) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  convertQuote: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useQuotesStore = create<QuotesState>((set) => ({
  quotes: [],
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  converting: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  loadQuotes: async (page = 1, limit = 1000) => {
    set({ loading: true, error: null });
    try {
      const response = (await api.getQuotes({ page: String(page), limit: String(limit) })) as {
        data: Quote[];
        pagination: PaginationInfo;
      };
      set({ 
        quotes: response.data, 
        pagination: response.pagination,
        loading: false 
      });
    } catch (error) {
      set({ error: 'Error al cargar cotizaciones', loading: false });
      throw error;
    }
  },

  createQuote: async (data) => {
    set({ creating: true, error: null });
    try {
      const newQuote = (await api.createQuote(data)) as Quote;
      set((state) => ({ 
        quotes: [newQuote, ...state.quotes],
        creating: false,
      }));
      return newQuote;
    } catch (error) {
      set({ error: 'Error al crear cotización', creating: false });
      throw error;
    }
  },

  updateQuote: async (id, data) => {
    set({ updating: true, error: null });
    try {
      const updatedQuote = (await api.updateQuote(id, data)) as Quote;
      set((state) => ({
        quotes: state.quotes.map((q) =>
          q.id === id ? updatedQuote : q
        ),
        updating: false,
      }));
    } catch (error) {
      set({ error: 'Error al actualizar cotización', updating: false });
      throw error;
    }
  },

  deleteQuote: async (id) => {
    set({ deleting: true, error: null });
    try {
      await api.deleteQuote(id);
      set((state) => ({
        quotes: state.quotes.filter((q) => q.id !== id),
        deleting: false,
      }));
    } catch (error) {
      set({ error: 'Error al eliminar cotización', deleting: false });
      throw error;
    }
  },

  convertQuote: async (id) => {
    set({ converting: true, error: null });
    try {
      await api.convertQuote(id);
      set((state) => ({
        quotes: state.quotes.map((q) =>
          q.id === id ? { ...q, estado: 'Convertida' } : q
        ),
        converting: false,
      }));
    } catch (error) {
      set({ error: 'Error al convertir cotización', converting: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
