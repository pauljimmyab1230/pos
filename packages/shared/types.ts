// ==================== USUARIOS ====================
export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  businessId?: string;
}

// ==================== NEGOCIO ====================
export interface Business {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion: string;
  telefono?: string;
  email?: string;
  igv: number;
  giroComercial?: string;
  logo?: string;
  mensajePdf?: string;
  ticketera?: string;
  disenoTicket?: string;
  disenoPdf?: string;
  conexionImpresora?: string;
}

// ==================== CLIENTES ====================
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

// ==================== PRODUCTOS ====================
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

// ==================== VENTAS ====================
export interface SaleItem {
  id?: string;
  productId: string;
  cantidad: number;
  precioUnit: number;
  subtotal?: number;
  descuento?: number;
  product?: Product;
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
  cliente?: Client;
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

// ==================== COTIZACIONES ====================
export interface QuoteItem {
  id?: string;
  productId: string;
  cantidad: number;
  precioUnit: number;
  subtotal?: number;
  descuento?: number;
  product?: Product;
}

export interface Quote {
  id: string;
  serie: string;
  correlativo: number;
  fechaEmision: string;
  moneda: string;
  estado: string;
  clienteId?: string;
  cliente?: Client;
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

// ==================== GUÍAS DE REMISIÓN ====================
export interface GuideItem {
  id?: string;
  productId: string;
  cantidad: number;
  product?: Product;
}

export interface Guide {
  id: string;
  serie: string;
  correlativo: number;
  fechaEmision: string;
  destinatarioTipoDoc?: string;
  destinatarioNumDoc?: string;
  destinatarioNombres?: string;
  origenRegion?: string;
  origenProvincia?: string;
  origenDistrito?: string;
  origenDireccion?: string;
  destinoRegion?: string;
  destinoProvincia?: string;
  destinoDistrito?: string;
  destinoDireccion?: string;
  motivoEnvio?: string;
  descripcionMotivo?: string;
  fechaEnvio?: string;
  cantidadBultos?: number;
  pesoTotal?: number;
  unidadPeso?: string;
  tipoTransporte?: string;
  conductorTipoDoc?: string;
  conductorNumDoc?: string;
  conductorNombres?: string;
  conductorLicencia?: string;
  vehiculoPlaca?: string;
  observacion?: string;
  items?: GuideItem[];
}

// ==================== CAJA ====================
export interface CashboxMovement {
  id: string;
  tipo: string;
  concepto: string;
  monto: number;
  categoria?: string;
  comprobante?: string;
  fecha: string;
}

// ==================== GASTOS ====================
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

// ==================== CUENTAS BANCARIAS ====================
export interface BankAccount {
  id: string;
  banco: string;
  tipoCuenta: string;
  moneda: string;
  numeroCuenta: string;
  cci?: string;
  visiblePDF: boolean;
}

// ==================== SERIES ====================
export interface Series {
  id: string;
  tipo: string;
  prefijo: string;
  numeroActual: number;
}

// ==================== REPORTES ====================
export interface DailySummary {
  comprobantes: number;
  ingresos: number;
  egresos: number;
  saldo: number;
}

export interface SalesReport {
  resumen: {
    totalVentas: number;
    totalIGV: number;
    cantidadComprobantes: number;
  };
  ventas: Sale[];
}

export interface MonthlyReport {
  mes: string;
  totalVentas: number;
  cantidadComprobantes: number;
}

// ==================== API RESPONSES ====================
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
