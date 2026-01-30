import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate, isAdmin, isSalesCaptain } from '../middleware/auth.middleware';

const router = Router();
const reportController = new ReportController();

// All routes require authentication
router.use(authenticate);

// Sales reports
router.get('/sales/summary', reportController.getSalesSummary);
router.get('/sales/by-area', reportController.getSalesByArea);
router.get('/sales/by-captain', reportController.getSalesByCaptain);
router.get('/sales/by-store', reportController.getSalesByStore);
router.get('/sales/by-product', reportController.getSalesByProduct);

// Payment reports
router.get('/payments/pending', reportController.getPendingPayments);
router.get('/payments/received', reportController.getReceivedPayments);
router.get('/payments/vendor-dues', reportController.getVendorDues);

// Dispatch reports
router.get('/dispatch/status', reportController.getDispatchStatus);
router.get('/dispatch/pending', reportController.getPendingDispatches);

// Attendance reports
router.get('/attendance/summary', isAdmin, reportController.getAttendanceSummary);
router.get('/attendance/by-user', isAdmin, reportController.getAttendanceByUser);

// Store classification
router.get('/stores/classifications', reportController.getStoreClassifications);
router.get('/stores/classification-thresholds', reportController.getClassificationThresholds);
router.put('/stores/classification-thresholds', isAdmin, reportController.updateClassificationThresholds);
router.post('/stores/update-classifications', isAdmin, reportController.updateStoreClassifications);

// Sales Captain performance
router.get('/captain/performance', reportController.getSalesCaptainPerformance);
router.get('/captain/pending-reminders', reportController.getPendingPaymentReminders);
router.get('/captain/collections', reportController.getSalesCaptainCollections);

// Dashboard data
router.get('/dashboard', reportController.getDashboardData);

export default router;
