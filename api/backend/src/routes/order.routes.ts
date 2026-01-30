import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const orderController = new OrderController();

// All routes require authentication
router.use(authMiddleware);

// Get routes
router.get('/', orderController.getAllOrders);
router.get('/my-orders', orderController.getMyOrders);
router.get('/submitted', orderController.getSubmittedOrders);
router.get('/:id', orderController.getOrderById);

// Create and update routes
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.put('/:id/submit', orderController.submitOrder);
router.put('/:id/approve', orderController.approveOrder);
router.put('/:id/cancel', orderController.cancelOrder);
router.delete('/:id', orderController.deleteOrder);

export default router;
