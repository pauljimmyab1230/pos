import { create } from 'zustand';
import { api } from '../services/api';

// ==================== CONSTANTES ====================
export const REORDER_POINT = 5;
export const DEFAULT_PAGE_SIZE = 50;

// ==================== TIPOS ====================
export interface Product {
  id: string;
  tipo: string;
  nombre: string;
  codigo?: string;
  barcode?: string;
  categoria?: string;
  marca?: string;
  moneda?: string;
  unidadMedida: string;
  precioConIGV: number;
  precioSinIGV: number;
  costo?: number;
  stock: number;
  stockMinimo: number;
  categoriaSunat: string;
  catalogoVirtual: boolean;
  temporal?: boolean;
  imagen?: string;
  activo: boolean;
}

export interface ProductFormData {
  tipo: string;
  nombre: string;
  codigo: string;
  barcode: string;
  categoria: string;
  marca: string;
  moneda: string;
  unidadMedida: string;
  precioConIGV: string;
  precioSinIGV: string;
  costo: string;
  stock: string;
  categoriaSunat: string;
  catalogoVirtual: boolean;
  imagen: string;
}

export interface InventoryFilters {
  agotados: boolean;
  bajoStock: boolean;
  porReponer: boolean;
}

export interface InventoryStats {
  agotados: number;
  bajoStock: number;
  porReponer: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ==================== ESTADO ====================
interface ProductsState {
  products: Product[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
  pagination: PaginationInfo;
  
  // Acciones
  loadProducts: (page?: number, limit?: number) => Promise<void>;
  createProduct: (data: Partial<Product>) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  searchByBarcode: (code: string) => Promise<Product | null>;
  clearError: () => void;
  
  // Selectores computados
  getFilteredProducts: (filters: {
    activeTabs: string[];
    search: string;
    inventoryFilters: InventoryFilters;
  }) => Product[];
  getInventoryStats: () => InventoryStats;
}

// ==================== STORE ====================
export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
  pagination: {
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  },

  loadProducts: async () => {
    set({ loading: true, error: null });
    try {
      // Cargamos todos los productos para poder filtrar en el frontend
      // En el futuro se pueden mover los filtros al backend
      const response = (await api.getProducts({ limit: '1000' })) as {
        data: Product[];
        pagination: PaginationInfo;
      };
      set({ 
        products: response.data, 
        pagination: response.pagination,
        loading: false 
      });
    } catch (error) {
      set({ error: 'Error al cargar productos', loading: false });
      throw error;
    }
  },

  createProduct: async (data) => {
    set({ creating: true, error: null });
    try {
      const newProduct = (await api.createProduct(data)) as Product;
      set((state) => ({
        products: [...state.products, newProduct],
        creating: false,
      }));
      return newProduct;
    } catch (error) {
      set({ error: 'Error al crear producto', creating: false });
      throw error;
    }
  },

  updateProduct: async (id, data) => {
    set({ updating: true, error: null });
    try {
      const updatedProduct = (await api.updateProduct(id, data)) as Product;
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? updatedProduct : p
        ),
        updating: false,
      }));
    } catch (error) {
      set({ error: 'Error al actualizar producto', updating: false });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    set({ deleting: true, error: null });
    try {
      await api.deleteProduct(id);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        deleting: false,
      }));
    } catch (error) {
      set({ error: 'Error al eliminar producto', deleting: false });
      throw error;
    }
  },

  searchByBarcode: async (code) => {
    try {
      const product = (await api.searchByBarcode(code)) as Product;
      return product;
    } catch (error) {
      return null;
    }
  },

  clearError: () => set({ error: null }),

  getFilteredProducts: ({ activeTabs, search, inventoryFilters }) => {
    const { products } = get();
    
    return products.filter((p) => {
      // Filtro por tipo
      const matchesType =
        (activeTabs.includes('Productos') && p.tipo === 'Producto') ||
        (activeTabs.includes('Servicios') && p.tipo === 'Servicio');

      // Filtro por búsqueda
      const searchLower = search.toLowerCase();
      const matchesSearch =
        p.nombre.toLowerCase().includes(searchLower) ||
        p.codigo?.toLowerCase().includes(searchLower) ||
        p.barcode?.toLowerCase().includes(searchLower);

      // Filtro por inventario
      let matchesInventory = true;
      const hasInventoryFilter =
        inventoryFilters.agotados ||
        inventoryFilters.bajoStock ||
        inventoryFilters.porReponer;

      if (hasInventoryFilter) {
        matchesInventory = false;
        if (inventoryFilters.agotados && p.stock === 0) {
          matchesInventory = true;
        }
        if (inventoryFilters.bajoStock && p.stock > 0 && p.stock <= (p.stockMinimo || 0)) {
          matchesInventory = true;
        }
        if (inventoryFilters.porReponer && p.stock > 0 && p.stock <= REORDER_POINT) {
          matchesInventory = true;
        }
      }

      return matchesType && matchesSearch && matchesInventory;
    });
  },

  getInventoryStats: () => {
    const { products } = get();
    
    return {
      agotados: products.filter((p) => p.stock === 0).length,
      bajoStock: products.filter(
        (p) => p.stock > 0 && p.stock <= (p.stockMinimo || 0)
      ).length,
      porReponer: products.filter(
        (p) => p.stock > 0 && p.stock <= REORDER_POINT
      ).length,
    };
  },
}));
