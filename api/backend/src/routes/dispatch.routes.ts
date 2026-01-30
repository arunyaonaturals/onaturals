import { Router } from 'express';
import { DispatchController } from '../controllers/dispatch.controller';
import { authenticate, isAdmin } from '../middleware/auth.middleware';

const router = Router();
const dispatchController = new DispatchController();

// All routes require authentication
router.use(authenticate);

// Dispatch CRUD
router.get('/', dispatchController.getAllDispatches);
router.get('/pending', dispatchController.getPendingDispatches);
router.get('/by-priority', dispatchController.getDispatchesByPriority);
router.get('/small-orders', dispatchController.getSmallOrderDispatches);
router.get('/:id', dispatchController.getDispatchById);
router.post('/', dispatchController.createDispatch);
router.put('/:id', dispatchController.updateDispatch);
router.delete('/:id', isAdmin, dispatchController.deleteDispatch);

// Status updates
router.put('/:id/status', dispatchController.updateDispatchStatus);
router.put('/:id/priority', isAdmin, dispatchController.updatePriority);

// Combine small orders
router.post('/combine-small-orders', dispatchController.combineSmallOrders);

export default router;
