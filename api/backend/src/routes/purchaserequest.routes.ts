import { Router } from 'express';
import { PurchaseRequestController } from '../controllers/purchaserequest.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';

const router = Router();
const purchaseRequestController = new PurchaseRequestController();

// All routes require authentication
router.use(authenticate);

// Get routes
router.get('/', purchaseRequestController.getAllRequests);
router.get('/pending', purchaseRequestController.getPendingRequests);
router.get('/:id', purchaseRequestController.getRequestById);

// Create and update routes (admin only)
router.post('/', isAdmin, purchaseRequestController.createRequest);
router.put('/:id', isAdmin, purchaseRequestController.updateRequest);
router.put('/:id/submit', isAdmin, purchaseRequestController.submitRequest);
router.put('/:id/receive', isAdmin, purchaseRequestController.recordReceipt);
router.put('/:id/cancel', isAdmin, purchaseRequestController.cancelRequest);
router.delete('/:id', isAdmin, purchaseRequestController.deleteRequest);

export default router;
