import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const paymentController = new PaymentController();

// All routes require authentication
router.use(authMiddleware);

// Get routes
router.get('/', paymentController.getAllPayments);
router.get('/my-collections', paymentController.getMyCollections);
router.get('/pending', paymentController.getPendingPayments);
router.get('/invoice/:invoice_id', paymentController.getInvoicePayments);

// Create and delete routes
router.post('/', paymentController.recordPayment);
router.delete('/:id', paymentController.deletePayment);

export default router;
