import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { runMigrations } from '../backend/src/database/migrate';

// Import routes
import authRoutes from '../backend/src/routes/auth.routes';
import userRoutes from '../backend/src/routes/user.routes';
import productRoutes from '../backend/src/routes/product.routes';
import storeRoutes from '../backend/src/routes/store.routes';
import areaRoutes from '../backend/src/routes/area.routes';
import orderRoutes from '../backend/src/routes/order.routes';
import invoiceRoutes from '../backend/src/routes/invoice.routes';
import paymentRoutes from '../backend/src/routes/payment.routes';
import dispatchRoutes from '../backend/src/routes/dispatch.routes';
import vendorRoutes from '../backend/src/routes/vendor.routes';
import rawMaterialRoutes from '../backend/src/routes/rawmaterial.routes';
import purchaseRoutes from '../backend/src/routes/purchase.routes';
import purchaseRequestRoutes from '../backend/src/routes/purchaserequest.routes';
import productionRoutes from '../backend/src/routes/production.routes';
import packingRoutes from '../backend/src/routes/packing.routes';
import reportRoutes from '../backend/src/routes/report.routes';
import attendanceRoutes from '../backend/src/routes/attendance.routes';
import salaryRoutes from '../backend/src/routes/salary.routes';
import staffRoutes from '../backend/src/routes/staff.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/purchase-requests', purchaseRequestRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/packing', packingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/staff', staffRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database flag
let dbInitialized = false;

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Run migrations once on first request
  if (!dbInitialized) {
    try {
      await runMigrations();
      dbInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      return res.status(500).json({ success: false, message: 'Database initialization failed' });
    }
  }
  
  return app(req as any, res as any);
}
