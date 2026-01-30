import { Router } from 'express';
import { SalaryController } from '../controllers/salary.controller';
import { authenticate, isAdmin, isStaff } from '../middleware/auth.middleware';

const router = Router();
const salaryController = new SalaryController();

// All routes require authentication
router.use(authenticate);

// Salary structure
router.get('/structure', isAdmin, salaryController.getAllSalaryStructures);
router.get('/structure/:userId', isAdmin, salaryController.getUserSalaryStructure);
router.post('/structure', isAdmin, salaryController.createSalaryStructure);
router.put('/structure/:id', isAdmin, salaryController.updateSalaryStructure);

// Salary payments
router.get('/payments', isAdmin, salaryController.getAllPayments);
router.get('/payments/my-payments', isStaff, salaryController.getMyPayments);
router.get('/payments/:id', salaryController.getPaymentById);
router.get('/payments/:id/payslip', salaryController.generatePayslip);
router.post('/payments/calculate', isAdmin, salaryController.calculateSalary);
router.post('/payments', isAdmin, salaryController.processSalaryPayment);
router.put('/payments/:id', isAdmin, salaryController.updatePayment);

export default router;
