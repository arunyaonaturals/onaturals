import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import storesRoutes from './backend/routes/stores.js';
import productsRoutes from './backend/routes/products.js';
import billingRoutes from './backend/routes/billing.js';
import salesOrdersRoutes from './backend/routes/sales-orders.js';
import companySettingsRoutes from './backend/routes/company-settings.js';
import storeProductMarginsRoutes from './backend/routes/store-product-margins.js';
import staffRoutes from './backend/routes/staff.js';
import beatsRoutes from './backend/routes/beats.js';
import settingsRoutes from './backend/routes/settings.js';
import suppliersRoutes from './backend/routes/suppliers.js';
import purchaseOrdersRoutes from './backend/routes/purchase-orders.js';
import payrollRoutes from './backend/routes/payroll.js';
import authRoutes from './backend/routes/auth.js';
import inventoryRoutes from './backend/routes/inventory.js';
import productBatchesRoutes from './backend/routes/product-batches.js';
import orderDeliveryRoutes from './backend/routes/order-delivery.js';
import rawMaterialsRoutes from './backend/routes/raw-materials.js';
import productionBatchesRoutes from './backend/routes/production-batches.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '/')));

// API Routes
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

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Only listen in development (Vercel handles this in production)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// Export for Vercel serverless
export default app;
