import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

export interface Business {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  telefono?: string;
  email?: string;
  igv?: number;
  logo?: string;
  giroComercial?: string;
  mensajePdf?: string;
  ticketera?: string;
  disenoTicket?: string;
  disenoPdf?: string;
  conexionImpresora?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  business: Business | null;
  isAuthenticated: boolean;
  login: (token: string, user: User, business: Business) => void;
  logout: () => void;
  updateBusiness: (business: Business) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      business: null,
      isAuthenticated: false,
      login: (token, user, business) =>
        set({ token, user, business, isAuthenticated: true }),
      logout: () =>
        set({ token: null, user: null, business: null, isAuthenticated: false }),
      updateBusiness: (business) => set({ business }),
    }),
    { name: 'pos-auth' }
  )
);
