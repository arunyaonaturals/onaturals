import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from '../backend/src/config/database';

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

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on startup
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
  next();
});

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

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;
