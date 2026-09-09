import { create } from 'zustand';
import { api } from '../services/api';

export interface Expense {
  id: string;
  descripcion: string;
  categoria: string;
  monto: number;
  pagado: boolean;
  metodoPago?: string;
  fechaPago?: string;
  proveedor?: string;
  comprobante?: string;
  createdAt: string;
}

interface ExpensesState {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  loadExpenses: () => Promise<void>;
  createExpense: (data: Partial<Expense>) => Promise<Expense>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useExpensesStore = create<ExpensesState>((set) => ({
  expenses: [],
  loading: false,
  error: null,

  loadExpenses: async () => {
    set({ loading: true, error: null });
    try {
      const data = (await api.getExpenses()) as Expense[];
      set({ expenses: data, loading: false });
    } catch (error) {
      set({ error: 'Error al cargar gastos', loading: false });
      throw error;
    }
  },

  createExpense: async (data) => {
    try {
      const newExpense = (await api.createExpense(data)) as Expense;
      set((state) => ({ expenses: [newExpense, ...state.expenses] }));
      return newExpense;
    } catch (error) {
      set({ error: 'Error al crear gasto' });
      throw error;
    }
  },

  updateExpense: async (id, data) => {
    try {
      await api.updateExpense(id, data);
      set((state) => ({
        expenses: state.expenses.map((e) =>
          e.id === id ? { ...e, ...data } : e
        ),
      }));
    } catch (error) {
      set({ error: 'Error al actualizar gasto' });
      throw error;
    }
  },

  deleteExpense: async (id) => {
    try {
      await api.deleteExpense(id);
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
      }));
    } catch (error) {
      set({ error: 'Error al eliminar gasto' });
      throw error;
    }
  },
}));
