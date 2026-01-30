import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { runMigrations } from './database/migrate';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import areaRoutes from './routes/area.routes';
import storeRoutes from './routes/store.routes';
import invoiceRoutes from './routes/invoice.routes';
import vendorRoutes from './routes/vendor.routes';
import purchaseRoutes from './routes/purchase.routes';
import packingRoutes from './routes/packing.routes';
import dispatchRoutes from './routes/dispatch.routes';
import attendanceRoutes from './routes/attendance.routes';
import salaryRoutes from './routes/salary.routes';
import reportRoutes from './routes/report.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import rawMaterialRoutes from './routes/rawmaterial.routes';
import productionRoutes from './routes/production.routes';
import purchaseRequestRoutes from './routes/purchaserequest.routes';
import staffRoutes from './routes/staff.routes';
import path from 'path';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/packing', packingRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/purchase-requests', purchaseRequestRoutes);
app.use('/api/staff', staffRoutes);

// Health check route
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Arunya ERP API is running' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize database and run migrations
    await runMigrations();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
