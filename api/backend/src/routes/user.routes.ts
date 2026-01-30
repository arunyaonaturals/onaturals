import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticate);

// Admin only routes
router.get('/', isAdmin, userController.getAllUsers);
router.get('/sales-captains', userController.getSalesCaptains);
router.get('/:id', isAdmin, userController.getUserById);
router.post('/', isAdmin, userController.createUser);
router.put('/:id', isAdmin, userController.updateUser);
router.delete('/:id', isAdmin, userController.deleteUser);

export default router;
