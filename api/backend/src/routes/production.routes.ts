import { Router } from 'express';
import { ProductionController } from '../controllers/production.controller';
import { authenticate, isAdmin, isSalesCaptain } from '../middleware/auth.middleware';

const router = Router();
const productionController = new ProductionController();

// All routes require authentication
router.use(authenticate);

// Get routes
router.get('/', productionController.getAllProductionOrders);
router.get('/suggestions', productionController.getSuggestedProduction);
router.get('/order-demand', productionController.getOrderDemand);

// Batch management routes (must be before :id route)
router.get('/batches', productionController.getAllBatches);
router.get('/batches/available', productionController.getAvailableBatches);
router.get('/batches/product/:product_id', productionController.getProductBatches);

router.get('/:id', productionController.getProductionOrderById);

// Production order management
router.post('/', isAdmin, productionController.createProductionOrder);
router.put('/:id/start', isAdmin, productionController.startProduction);
router.put('/:id/complete', isAdmin, productionController.completeProduction);
router.put('/:id/cancel', isAdmin, productionController.cancelProduction);

// Product recipe management
router.get('/recipe/:product_id', productionController.getProductRecipes);
router.post('/recipe/:product_id', isAdmin, productionController.setProductRecipe);

export default router;
