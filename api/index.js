import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import storesRoutes from '../backend/routes/stores.js';
import productsRoutes from '../backend/routes/products.js';
import billingRoutes from '../backend/routes/billing.js';
import salesOrdersRoutes from '../backend/routes/sales-orders.js';
import companySettingsRoutes from '../backend/routes/company-settings.js';
import storeProductMarginsRoutes from '../backend/routes/store-product-margins.js';
import staffRoutes from '../backend/routes/staff.js';
import beatsRoutes from '../backend/routes/beats.js';
import settingsRoutes from '../backend/routes/settings.js';
import suppliersRoutes from '../backend/routes/suppliers.js';
import purchaseOrdersRoutes from '../backend/routes/purchase-orders.js';
import payrollRoutes from '../backend/routes/payroll.js';
import authRoutes from '../backend/routes/auth.js';
import inventoryRoutes from '../backend/routes/inventory.js';
import productBatchesRoutes from '../backend/routes/product-batches.js';
import orderDeliveryRoutes from '../backend/routes/order-delivery.js';
import rawMaterialsRoutes from '../backend/routes/raw-materials.js';
import productionBatchesRoutes from '../backend/routes/production-batches.js';

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// API Routes - Note: In Vercel, these will be accessed via /api/* paths
app.use('/api/stores', storesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/sales-orders', salesOrdersRoutes);
app.use('/api/company-settings', companySettingsRoutes);
app.use('/api/store-product-margins', storeProductMarginsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/beats', beatsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/product-batches', productBatchesRoutes);
app.use('/api/order-delivery', orderDeliveryRoutes);
app.use('/api/raw-materials', rawMaterialsRoutes);
app.use('/api/production-batches', productionBatchesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        turso_url_set: !!process.env.TURSO_URL,
        turso_auth_set: !!process.env.TURSO_AUTH_TOKEN,
        node_env: process.env.NODE_ENV
    });
});

// Database test endpoint
app.get('/api/db-test', async (req, res) => {
    try {
        const { createClient } = await import('@libsql/client');

        if (!process.env.TURSO_URL) {
            return res.status(500).json({ error: 'TURSO_URL not configured' });
        }

        const client = createClient({
            url: process.env.TURSO_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });

        const result = await client.execute('SELECT 1 as test');
        res.json({
            status: 'ok',
            dbConnected: true,
            result: result.rows
        });
    } catch (error) {
        console.error('DB Test Error:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Export for Vercel serverless
export default app;
