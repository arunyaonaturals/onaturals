import { Router } from 'express';
import { PurchaseController } from '../controllers/purchase.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';

const router = Router();
const purchaseController = new PurchaseController();

// All routes require authentication
router.use(authenticate);

// Raw material receipts
router.get('/receipts', purchaseController.getAllReceipts);
router.get('/receipts/pending-payments', purchaseController.getPendingPayments);
router.get('/receipts/overdue', purchaseController.getOverduePayments);
router.get('/receipts/due-soon', purchaseController.getDueSoonPayments);
router.get('/receipts/reminders', purchaseController.getPaymentReminders);
router.get('/receipts/:id', purchaseController.getReceiptById);
router.post('/receipts', isAdmin, purchaseController.createReceipt);
router.put('/receipts/:id', isAdmin, purchaseController.updateReceipt);
router.delete('/receipts/:id', isAdmin, purchaseController.deleteReceipt);

// Mark receipt as paid
router.put('/receipts/:id/mark-paid', isAdmin, purchaseController.markReceiptPaid);

export default router;
