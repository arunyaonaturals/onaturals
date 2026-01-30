import { Router } from 'express';
import { RawMaterialController } from '../controllers/rawmaterial.controller';
import { authenticate, isAdmin, isSalesCaptain } from '../middleware/auth.middleware';

const router = Router();
const rawMaterialController = new RawMaterialController();

// All routes require authentication
router.use(authenticate);

// Get routes
router.get('/', rawMaterialController.getAllRawMaterials);
router.get('/low-stock', rawMaterialController.getLowStockAlerts);
router.get('/requests', rawMaterialController.getAllMaterialRequests);
router.get('/requests/pending', rawMaterialController.getPendingArrivals);
router.get('/requests/:id', rawMaterialController.getRequestForReceiving);
router.get('/:id', rawMaterialController.getRawMaterialById);
router.get('/:id/recipes', rawMaterialController.getRecipesForMaterial);
router.get('/:id/requests', rawMaterialController.getMaterialRequests);

// Create, update, delete routes
router.post('/', isAdmin, rawMaterialController.createRawMaterial);
router.put('/:id', isAdmin, rawMaterialController.updateRawMaterial);
router.delete('/:id', isAdmin, rawMaterialController.deleteRawMaterial);

// Stock adjustment
router.put('/:id/adjust-stock', isAdmin, rawMaterialController.adjustStock);

export default router;
