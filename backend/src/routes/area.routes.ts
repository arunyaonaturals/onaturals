import { Router } from 'express';
import { AreaController } from '../controllers/area.controller';
import { authenticate, isAdmin, isSalesCaptain } from '../middleware/auth.middleware';

const router = Router();
const areaController = new AreaController();

// All routes require authentication
router.use(authenticate);

// Area CRUD
router.get('/', areaController.getAllAreas);
router.get('/:id', areaController.getAreaById);
router.get('/:id/stores', areaController.getStoresByArea);
router.get('/:id/sales-captain', areaController.getSalesCaptainByArea);
router.post('/', isAdmin, areaController.createArea);
router.put('/:id', isAdmin, areaController.updateArea);
router.delete('/:id', isAdmin, areaController.deleteArea);

// Assign sales captain to area
router.post('/:id/assign-captain', isAdmin, areaController.assignSalesCaptain);

export default router;
