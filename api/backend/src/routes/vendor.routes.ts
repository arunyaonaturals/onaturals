import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';

const router = Router();
const vendorController = new VendorController();

// All routes require authentication
router.use(authenticate);

// Vendor CRUD
router.get('/', vendorController.getAllVendors);
router.get('/search', vendorController.searchVendors);
router.get('/:id', vendorController.getVendorById);
router.get('/:id/payments', vendorController.getVendorPayments);
router.post('/', isAdmin, vendorController.createVendor);
router.put('/:id', isAdmin, vendorController.updateVendor);
router.delete('/:id', isAdmin, vendorController.deleteVendor);

// Vendor billing terms
router.get('/:id/billing-terms', vendorController.getBillingTerms);
router.post('/:id/billing-terms', isAdmin, vendorController.setBillingTerms);

// Vendor payments
router.post('/:id/payments', isAdmin, vendorController.recordPayment);

export default router;
