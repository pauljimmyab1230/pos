const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('pos-auth');
  let parsedToken = null;

  if (token) {
    try {
      const auth = JSON.parse(token);
      parsedToken = auth.state?.token;
    } catch {}
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(parsedToken ? { Authorization: `Bearer ${parsedToken}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error del servidor' }));
    throw new Error(error.error || 'Error del servidor');
  }

  return res.json();
}

export const api = {
  // Auth
  login: (data: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: any) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  getProfile: () => request('/auth/profile'),

  // Business
  getBusiness: () => request('/business'),
  updateBusiness: (data: any) =>
    request('/business', { method: 'PUT', body: JSON.stringify(data) }),

  // Users
  getUsers: () => request('/users'),
  getUser: (id: string) => request(`/users/${id}`),
  createUser: (data: any) =>
    request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) =>
    request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request(`/users/${id}`, { method: 'DELETE' }),

  // Clients
  getClients: () => request('/clients'),
  getClient: (id: string) => request(`/clients/${id}`),
  searchClient: (doc: string) => request(`/clients/search/${doc}`),
  createClient: (data: any) =>
    request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: any) =>
    request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: string) =>
    request(`/clients/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/products${query}`);
  },
  getProduct: (id: string) => request(`/products/${id}`),
  searchByBarcode: (code: string) => request(`/products/barcode/${code}`),
  createProduct: (data: any) =>
    request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    request(`/products/${id}`, { method: 'DELETE' }),

  // Sales
  getSales: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/sales${query}`);
  },
  getSale: (id: string) => request(`/sales/${id}`),
  createSale: (data: any) =>
    request('/sales', { method: 'POST', body: JSON.stringify(data) }),
  updateSale: (id: string, data: any) =>
    request(`/sales/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelSale: (id: string) =>
    request(`/sales/${id}/cancel`, { method: 'PUT' }),
  getDailySummary: () => request('/sales/daily'),

  // Quotes
  getQuotes: () => request('/quotes?' + Date.now()),
  getQuote: (id: string) => request(`/quotes/${id}?${Date.now()}`),
  createQuote: (data: any) =>
    request('/quotes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuote: (id: string, data: any) =>
    request(`/quotes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuote: (id: string) =>
    request(`/quotes/${id}`, { method: 'DELETE' }),
  convertQuote: (id: string) =>
    request(`/quotes/${id}/convert`, { method: 'PUT' }),

  // Guides
  getGuides: () => request('/guides'),
  getGuide: (id: string) => request(`/guides/${id}`),
  createGuide: (data: any) =>
    request('/guides', { method: 'POST', body: JSON.stringify(data) }),

  // Cashbox
  getBalance: () => request('/cashbox/balance'),
  addMovement: (data: any) =>
    request('/cashbox/movement', { method: 'POST', body: JSON.stringify(data) }),
  getCashboxHistory: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/cashbox/history${query}`);
  },

  // Expenses
  getExpenses: () => request('/expenses'),
  createExpense: (data: any) =>
    request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: string, data: any) =>
    request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: string) =>
    request(`/expenses/${id}`, { method: 'DELETE' }),

  // Reports
  getSalesReport: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reports/sales${query}`);
  },
  getMonthlyReport: () => request('/reports/monthly'),
  getProductsReport: () => request('/reports/products'),
  getClientsReport: () => request('/reports/clients'),

  // Settings
  getSeries: () => request('/settings/series'),
  updateSeries: (series: any[]) =>
    request('/settings/series', { method: 'PUT', body: JSON.stringify({ series }) }),
  getBanks: () => request('/settings/banks'),
  createBank: (data: any) =>
    request('/settings/banks', { method: 'POST', body: JSON.stringify(data) }),
  updateBank: (id: string, data: any) =>
    request(`/settings/banks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBank: (id: string) =>
    request(`/settings/banks/${id}`, { method: 'DELETE' }),
};
