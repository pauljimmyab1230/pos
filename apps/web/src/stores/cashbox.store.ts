import { create } from 'zustand';
import { api } from '../services/api';

export interface CashboxMovement {
  id: string;
  tipo: string;
  concepto: string;
  monto: number;
  categoria?: string;
  comprobante?: string;
  fecha: string;
}

interface CashboxState {
  balance: number;
  movements: CashboxMovement[];
  loading: boolean;
  error: string | null;
  loadBalance: () => Promise<void>;
  loadMovements: (params?: Record<string, string>) => Promise<void>;
  addMovement: (data: { tipo: string; concepto: string; monto: number; categoria?: string; comprobante?: string }) => Promise<void>;
}

export const useCashboxStore = create<CashboxState>((set) => ({
  balance: 0,
  movements: [],
  loading: false,
  error: null,

  loadBalance: async () => {
    set({ loading: true, error: null });
    try {
      const data = (await api.getBalance()) as { balance: number };
      set({ balance: data.balance, loading: false });
    } catch (error) {
      set({ error: 'Error al cargar saldo', loading: false });
      throw error;
    }
  },

  loadMovements: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = (await api.getCashboxHistory(params)) as CashboxMovement[];
      set({ movements: data, loading: false });
    } catch (error) {
      set({ error: 'Error al cargar movimientos', loading: false });
      throw error;
    }
  },

  addMovement: async (data) => {
    try {
      const newMovement = (await api.addMovement(data)) as CashboxMovement;
      set((state) => ({
        movements: [newMovement, ...state.movements],
        balance: data.tipo === 'INGRESO'
          ? state.balance + data.monto
          : state.balance - data.monto,
      }));
    } catch (error) {
      set({ error: 'Error al registrar movimiento' });
      throw error;
    }
  },
}));
