import { create } from 'zustand';
import { api } from '../services/api';

export interface SaleItem {
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

export interface Payment {
  id?: string;
  metodo: string;
  monto: number;
}

export interface Sale {
  id: string;
  tipo: string;
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
  };
  subtotal: number;
  igv: number;
  total: number;
  metodoPago: string;
  observacion?: string;
  direccionEnvio?: string;
  origenCompra?: string;
  items?: SaleItem[];
  payments?: Payment[];
}

interface SalesState {
  sales: Sale[];
  loading: boolean;
  error: string | null;
  loadSales: (params?: Record<string, string>) => Promise<void>;
  createSale: (data: any) => Promise<Sale>;
  updateSale: (id: string, data: any) => Promise<void>;
  cancelSale: (id: string) => Promise<void>;
  getDailySummary: () => Promise<any>;
}

export const useSalesStore = create<SalesState>((set) => ({
  sales: [],
  loading: false,
  error: null,

  loadSales: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = (await api.getSales(params)) as Sale[];
      set({ sales: data, loading: false });
    } catch (error) {
      set({ error: 'Error al cargar ventas', loading: false });
      throw error;
    }
  },

  createSale: async (data) => {
    try {
      const newSale = (await api.createSale(data)) as Sale;
      set((state) => ({ sales: [newSale, ...state.sales] }));
      return newSale;
    } catch (error) {
      set({ error: 'Error al crear venta' });
      throw error;
    }
  },

  updateSale: async (id, data) => {
    try {
      await api.updateSale(id, data);
      set((state) => ({
        sales: state.sales.map((s) =>
          s.id === id ? { ...s, ...data } : s
        ),
      }));
    } catch (error) {
      set({ error: 'Error al actualizar venta' });
      throw error;
    }
  },

  cancelSale: async (id) => {
    try {
      await api.cancelSale(id);
      set((state) => ({
        sales: state.sales.map((s) =>
          s.id === id ? { ...s, estado: 'Anulada' } : s
        ),
      }));
    } catch (error) {
      set({ error: 'Error al anular venta' });
      throw error;
    }
  },

  getDailySummary: async () => {
    try {
      return await api.getDailySummary();
    } catch (error) {
      set({ error: 'Error al cargar resumen diario' });
      throw error;
    }
  },
}));
