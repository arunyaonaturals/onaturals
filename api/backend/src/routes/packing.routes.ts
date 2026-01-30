import { Router } from 'express';
import { PackingController } from '../controllers/packing.controller';
import { authenticate, isAdmin, isSalesCaptain } from '../middleware/auth.middleware';

const router = Router();
const packingController = new PackingController();

// All routes require authentication
router.use(authenticate);

// Packing orders
router.get('/', packingController.getAllPackingOrders);
router.get('/pending', packingController.getPendingPackingOrders);
router.get('/by-priority', packingController.getPackingOrdersByPriority);
router.get('/:id', packingController.getPackingOrderById);
router.post('/', isSalesCaptain, packingController.createPackingOrder);
router.put('/:id', packingController.updatePackingOrder);
router.delete('/:id', isAdmin, packingController.deletePackingOrder);

// Status updates
router.put('/:id/status', packingController.updatePackingStatus);
router.put('/:id/priority', isAdmin, packingController.updatePriority);

export default router;
