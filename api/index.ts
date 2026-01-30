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
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    dbInitialized,
    env: {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      hasJwtSecret: !!process.env.JWT_SECRET
    }
  });
});

// Debug endpoint to test database
app.get('/api/debug/db', async (req, res) => {
  try {
    const { queryOne } = await import('../backend/src/config/database');
    const userCount = await queryOne('SELECT COUNT(*) as count FROM users');
    res.json({ 
      success: true, 
      userCount: userCount?.count || 0,
      message: 'Database connection working'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Initialize database flag (persists across invocations in same container)
let dbInitialized = false;
let dbInitPromise: Promise<void> | null = null;

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Run migrations once (with promise to prevent concurrent runs)
  if (!dbInitialized && !dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        console.log('Initializing database and running migrations...');
        await runMigrations();
        dbInitialized = true;
        console.log('Database initialized successfully');
      } catch (error: any) {
        console.error('Database initialization error:', error);
        console.error('Error details:', error?.message, error?.stack);
        // Don't throw - let it retry on next request
        dbInitPromise = null;
        throw error;
      }
    })();
  }

  // Wait for initialization if in progress
  if (dbInitPromise) {
    try {
      await dbInitPromise;
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database initialization failed. Please check server logs.',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      });
    }
  }
  
  return app(req as any, res as any);
}
