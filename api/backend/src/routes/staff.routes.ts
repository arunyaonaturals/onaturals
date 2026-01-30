import { Router } from 'express';
import { StaffController } from '../controllers/staff.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';

const router = Router();
const staffController = new StaffController();

// File upload (multer) disabled for Vercel serverless - use cloud storage for photos

router.use(authenticate);

router.get('/', staffController.getAllStaff);
router.get('/stats', staffController.getStaffStats);
router.get('/role/:role', staffController.getStaffByRole);
router.get('/:id', staffController.getStaffById);

router.post('/', isAdmin, staffController.createStaff);
router.put('/:id', isAdmin, staffController.updateStaff);
// Photo upload disabled for Vercel - use cloud storage (S3, Cloudinary) to re-enable
router.delete('/:id', isAdmin, staffController.deleteStaff);
router.delete('/:id/permanent', isAdmin, staffController.permanentDeleteStaff);

export default router;
