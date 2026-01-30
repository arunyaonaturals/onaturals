import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { StaffController } from '../controllers/staff.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';

const router = Router();
const staffController = new StaffController();

// Configure multer for file uploads (local dev only; disabled for Vercel)
const uploadDir = path.join(__dirname, '../../uploads/staff');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, uploadDir); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'staff-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.get('/', staffController.getAllStaff);
router.get('/stats', staffController.getStaffStats);
router.get('/role/:role', staffController.getStaffByRole);
router.get('/:id', staffController.getStaffById);

router.post('/', isAdmin, staffController.createStaff);
router.put('/:id', isAdmin, staffController.updateStaff);
router.post('/:id/photo', isAdmin, upload.single('photo'), staffController.uploadPhoto);
router.delete('/:id', isAdmin, staffController.deleteStaff);
router.delete('/:id/permanent', isAdmin, staffController.permanentDeleteStaff);

export default router;
