import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { authenticate, isAdmin, isSalesCaptain } from '../middleware/auth.middleware';

const router = Router();
const invoiceController = new InvoiceController();

// All routes require authentication
router.use(authenticate);

// Invoice CRUD
router.get('/', invoiceController.getAllInvoices);
router.get('/my-invoices', isSalesCaptain, invoiceController.getMyInvoices);
router.get('/pending', invoiceController.getPendingInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.get('/:id/pdf', invoiceController.generateInvoicePDF);
router.post('/', isSalesCaptain, invoiceController.createInvoice);
router.post('/from-order', invoiceController.createInvoiceFromOrder);
router.put('/:id', isSalesCaptain, invoiceController.updateInvoice);
router.put('/:id/cancel', invoiceController.cancelInvoice);
router.delete('/:id', isAdmin, invoiceController.deleteInvoice);

// Invoice status updates
router.put('/:id/billing-status', isSalesCaptain, invoiceController.updateBillingStatus);
router.put('/:id/payment-status', isSalesCaptain, invoiceController.updatePaymentStatus);

export default router;
