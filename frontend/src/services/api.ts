import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data: any) => api.put('/auth/change-password', data),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id: number) => api.get(`/users/${id}`),
  getSalesCaptains: () => api.get('/users/sales-captains'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Products API
export const productsAPI = {
  getAll: (params?: any) => api.get('/products', { params }),
  getById: (id: number) => api.get(`/products/${id}`),
  search: (query: string) => api.get('/products/search', { params: { q: query } }),
  create: (data: any) => api.post('/products', data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories/list'),
  createCategory: (data: any) => api.post('/products/categories', data),
};

// Areas API
export const areasAPI = {
  getAll: () => api.get('/areas'),
  getById: (id: number) => api.get(`/areas/${id}`),
  getStores: (id: number) => api.get(`/areas/${id}/stores`),
  create: (data: any) => api.post('/areas', data),
  update: (id: number, data: any) => api.put(`/areas/${id}`, data),
  delete: (id: number) => api.delete(`/areas/${id}`),
  assignCaptain: (id: number, captainId: number) => api.post(`/areas/${id}/assign-captain`, { sales_captain_id: captainId }),
};

// Stores API
export const storesAPI = {
  getAll: (params?: any) => api.get('/stores', { params }),
  getMyStores: () => api.get('/stores/my-stores'),
  getById: (id: number) => api.get(`/stores/${id}`),
  search: (query: string) => api.get('/stores/search', { params: { q: query } }),
  create: (data: any) => api.post('/stores', data),
  update: (id: number, data: any) => api.put(`/stores/${id}`, data),
  delete: (id: number) => api.delete(`/stores/${id}`),
  getMargins: (id: number) => api.get(`/stores/${id}/margins`),
  setMargin: (id: number, data: any) => api.post(`/stores/${id}/margins`, data),
};

// Orders API
export const ordersAPI = {
  getAll: (params?: any) => api.get('/orders', { params }),
  getMyOrders: () => api.get('/orders/my-orders'),
  getSubmitted: () => api.get('/orders/submitted'),
  getById: (id: number) => api.get(`/orders/${id}`),
  create: (data: any) => api.post('/orders', data),
  update: (id: number, data: any) => api.put(`/orders/${id}`, data),
  submit: (id: number) => api.put(`/orders/${id}/submit`),
  approve: (id: number) => api.put(`/orders/${id}/approve`),
  cancel: (id: number) => api.put(`/orders/${id}/cancel`),
  delete: (id: number) => api.delete(`/orders/${id}`),
};

// Invoices API
export const invoicesAPI = {
  getAll: (params?: any) => api.get('/invoices', { params }),
  getMyInvoices: () => api.get('/invoices/my-invoices'),
  getPending: () => api.get('/invoices/pending'),
  getById: (id: number) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
  createFromOrder: (data: any) => api.post('/invoices/from-order', data),
  update: (id: number, data: any) => api.put(`/invoices/${id}`, data),
  cancel: (id: number) => api.put(`/invoices/${id}/cancel`),
  delete: (id: number) => api.delete(`/invoices/${id}`),
  updateBillingStatus: (id: number, status: string) => api.put(`/invoices/${id}/billing-status`, { billing_status: status }),
  updatePaymentStatus: (id: number, data: any) => api.put(`/invoices/${id}/payment-status`, data),
  downloadPDF: (id: number) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

// Payments API
export const paymentsAPI = {
  getAll: (params?: any) => api.get('/payments', { params }),
  getMyCollections: (params?: any) => api.get('/payments/my-collections', { params }),
  getPending: () => api.get('/payments/pending'),
  getInvoicePayments: (invoiceId: number) => api.get(`/payments/invoice/${invoiceId}`),
  record: (data: any) => api.post('/payments', data),
  delete: (id: number) => api.delete(`/payments/${id}`),
};

// Vendors API
export const vendorsAPI = {
  getAll: (params?: any) => api.get('/vendors', { params }),
  getById: (id: number) => api.get(`/vendors/${id}`),
  search: (query: string) => api.get('/vendors/search', { params: { q: query } }),
  getPayments: (id: number) => api.get(`/vendors/${id}/payments`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: number, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/vendors/${id}`),
  setBillingTerms: (id: number, days: number) => api.post(`/vendors/${id}/billing-terms`, { payment_days: days }),
  recordPayment: (id: number, data: any) => api.post(`/vendors/${id}/payments`, data),
};

// Purchase API
export const purchaseAPI = {
  getReceipts: (params?: any) => api.get('/purchases/receipts', { params }),
  getPendingPayments: () => api.get('/purchases/receipts/pending-payments'),
  getOverduePayments: () => api.get('/purchases/receipts/overdue'),
  getDueSoonPayments: () => api.get('/purchases/receipts/due-soon'),
  getPaymentReminders: () => api.get('/purchases/receipts/reminders'),
  getReceiptById: (id: number) => api.get(`/purchases/receipts/${id}`),
  createReceipt: (data: any) => api.post('/purchases/receipts', data),
  updateReceipt: (id: number, data: any) => api.put(`/purchases/receipts/${id}`, data),
  deleteReceipt: (id: number) => api.delete(`/purchases/receipts/${id}`),
  markPaid: (id: number, data: any) => api.put(`/purchases/receipts/${id}/mark-paid`, data),
};

// Purchase Requests API
export const purchaseRequestsAPI = {
  getAll: (params?: any) => api.get('/purchase-requests', { params }),
  getPending: () => api.get('/purchase-requests/pending'),
  getById: (id: number) => api.get(`/purchase-requests/${id}`),
  create: (data: any) => api.post('/purchase-requests', data),
  update: (id: number, data: any) => api.put(`/purchase-requests/${id}`, data),
  submit: (id: number) => api.put(`/purchase-requests/${id}/submit`),
  recordReceipt: (id: number, data: any) => api.put(`/purchase-requests/${id}/receive`, data),
  cancel: (id: number) => api.put(`/purchase-requests/${id}/cancel`),
  delete: (id: number) => api.delete(`/purchase-requests/${id}`),
};

// Raw Materials API
export const rawMaterialsAPI = {
  getAll: (params?: any) => api.get('/raw-materials', { params }),
  getLowStock: () => api.get('/raw-materials/low-stock'),
  getById: (id: number) => api.get(`/raw-materials/${id}`),
  getRecipes: (id: number) => api.get(`/raw-materials/${id}/recipes`),
  create: (data: any) => api.post('/raw-materials', data),
  update: (id: number, data: any) => api.put(`/raw-materials/${id}`, data),
  delete: (id: number) => api.delete(`/raw-materials/${id}`),
  adjustStock: (id: number, data: any) => api.put(`/raw-materials/${id}/adjust-stock`, data),
  // Request-related methods
  getAllRequests: (params?: any) => api.get('/raw-materials/requests', { params }),
  getPendingArrivals: () => api.get('/raw-materials/requests/pending'),
  getRequestById: (id: number) => api.get(`/raw-materials/requests/${id}`),
  getMaterialRequests: (id: number) => api.get(`/raw-materials/${id}/requests`),
};

// Production API
export const productionAPI = {
  getAll: (params?: any) => api.get('/production', { params }),
  getSuggestions: () => api.get('/production/suggestions'),
  getOrderDemand: () => api.get('/production/order-demand'),
  getById: (id: number) => api.get(`/production/${id}`),
  create: (data: any) => api.post('/production', data),
  start: (id: number) => api.put(`/production/${id}/start`),
  complete: (id: number, data?: any) => api.put(`/production/${id}/complete`, data),
  cancel: (id: number) => api.put(`/production/${id}/cancel`),
  getRecipe: (productId: number) => api.get(`/production/recipe/${productId}`),
  setRecipe: (productId: number, data: any) => api.post(`/production/recipe/${productId}`, data),
  // Batch management
  getAllBatches: (params?: any) => api.get('/production/batches', { params }),
  getAvailableBatches: (productId?: number) => api.get('/production/batches/available', { params: { product_id: productId } }),
  getProductBatches: (productId: number, params?: any) => api.get(`/production/batches/product/${productId}`, { params }),
};

// Packing API
export const packingAPI = {
  getAll: (params?: any) => api.get('/packing', { params }),
  getPending: () => api.get('/packing/pending'),
  getByPriority: () => api.get('/packing/by-priority'),
  getById: (id: number) => api.get(`/packing/${id}`),
  create: (data: any) => api.post('/packing', data),
  update: (id: number, data: any) => api.put(`/packing/${id}`, data),
  delete: (id: number) => api.delete(`/packing/${id}`),
  updateStatus: (id: number, status: string) => api.put(`/packing/${id}/status`, { status }),
  updatePriority: (id: number, priority: number) => api.put(`/packing/${id}/priority`, { priority }),
};

// Dispatch API
export const dispatchAPI = {
  getAll: (params?: any) => api.get('/dispatch', { params }),
  getPending: () => api.get('/dispatch/pending'),
  getByPriority: () => api.get('/dispatch/by-priority'),
  getSmallOrders: () => api.get('/dispatch/small-orders'),
  getById: (id: number) => api.get(`/dispatch/${id}`),
  create: (data: any) => api.post('/dispatch', data),
  update: (id: number, data: any) => api.put(`/dispatch/${id}`, data),
  delete: (id: number) => api.delete(`/dispatch/${id}`),
  updateStatus: (id: number, status: string) => api.put(`/dispatch/${id}/status`, { status }),
  updatePriority: (id: number, priority: number) => api.put(`/dispatch/${id}/priority`, { priority }),
  combineSmallOrders: (data: any) => api.post('/dispatch/combine-small-orders', data),
};

// Attendance API
export const attendanceAPI = {
  getAll: (params?: any) => api.get('/attendance', { params }),
  getMyAttendance: (params?: any) => api.get('/attendance/my-attendance', { params }),
  getToday: () => api.get('/attendance/today'),
  getReport: (params: any) => api.get('/attendance/report', { params }),
  getUserAttendance: (userId: number, params?: any) => api.get(`/attendance/user/${userId}`, { params }),
  mark: (data: any) => api.post('/attendance', data),
  update: (id: number, data: any) => api.put(`/attendance/${id}`, data),
  delete: (id: number) => api.delete(`/attendance/${id}`),
  getLeaves: (params?: any) => api.get('/attendance/leaves', { params }),
  getMyLeaves: () => api.get('/attendance/leaves/my-leaves'),
  applyLeave: (data: any) => api.post('/attendance/leaves', data),
  approveLeave: (id: number) => api.put(`/attendance/leaves/${id}/approve`),
  rejectLeave: (id: number, reason?: string) => api.put(`/attendance/leaves/${id}/reject`, { rejection_reason: reason }),
};

// Salary API
export const salaryAPI = {
  getStructures: () => api.get('/salary/structure'),
  getUserStructure: (userId: number) => api.get(`/salary/structure/${userId}`),
  createStructure: (data: any) => api.post('/salary/structure', data),
  updateStructure: (id: number, data: any) => api.put(`/salary/structure/${id}`, data),
  getPayments: (params?: any) => api.get('/salary/payments', { params }),
  getMyPayments: () => api.get('/salary/payments/my-payments'),
  getPaymentById: (id: number) => api.get(`/salary/payments/${id}`),
  calculateSalary: (data: any) => api.post('/salary/payments/calculate', data),
  processPayment: (data: any) => api.post('/salary/payments', data),
  updatePayment: (id: number, data: any) => api.put(`/salary/payments/${id}`, data),
  downloadPayslip: (id: number) => api.get(`/salary/payments/${id}/payslip`, { responseType: 'blob' }),
};

// Reports API
export const reportsAPI = {
  getSalesSummary: (params?: any) => api.get('/reports/sales/summary', { params }),
  getSalesByArea: (params?: any) => api.get('/reports/sales/by-area', { params }),
  getSalesByCaptain: (params?: any) => api.get('/reports/sales/by-captain', { params }),
  getSalesByStore: (params?: any) => api.get('/reports/sales/by-store', { params }),
  getSalesByProduct: (params?: any) => api.get('/reports/sales/by-product', { params }),
  getPendingPayments: () => api.get('/reports/payments/pending'),
  getReceivedPayments: (params?: any) => api.get('/reports/payments/received', { params }),
  getVendorDues: () => api.get('/reports/payments/vendor-dues'),
  getDispatchStatus: () => api.get('/reports/dispatch/status'),
  getPendingDispatches: () => api.get('/reports/dispatch/pending'),
  getAttendanceSummary: (params: any) => api.get('/reports/attendance/summary', { params }),
  getAttendanceByUser: (params: any) => api.get('/reports/attendance/by-user', { params }),
  getDashboard: () => api.get('/reports/dashboard'),
  // Store Classification
  getStoreClassifications: (params?: any) => api.get('/reports/stores/classifications', { params }),
  getClassificationThresholds: () => api.get('/reports/stores/classification-thresholds'),
  updateClassificationThresholds: (data: any) => api.put('/reports/stores/classification-thresholds', data),
  updateStoreClassifications: () => api.post('/reports/stores/update-classifications'),
  // Sales Captain Performance
  getCaptainPerformance: (params?: any) => api.get('/reports/captain/performance', { params }),
  getCaptainPendingReminders: (params?: any) => api.get('/reports/captain/pending-reminders', { params }),
  getCaptainCollections: (params?: any) => api.get('/reports/captain/collections', { params }),
};

// Staff API
export const staffAPI = {
  getAll: (params?: any) => api.get('/staff', { params }),
  getById: (id: number) => api.get(`/staff/${id}`),
  getByRole: (role: string) => api.get(`/staff/role/${role}`),
  getStats: () => api.get('/staff/stats'),
  create: (data: any) => api.post('/staff', data),
  update: (id: number, data: any) => api.put(`/staff/${id}`, data),
  uploadPhoto: (id: number, formData: FormData) => api.post(`/staff/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id: number) => api.delete(`/staff/${id}`),
  permanentDelete: (id: number) => api.delete(`/staff/${id}/permanent`),
};
