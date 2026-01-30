import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';
import { authenticate, isAdmin, isSalesCaptain } from '../middleware/auth.middleware';

const router = Router();
const storeController = new StoreController();

// All routes require authentication
router.use(authenticate);

// Store CRUD
router.get('/', storeController.getAllStores);
router.get('/my-stores', isSalesCaptain, storeController.getMyStores);
router.get('/search', storeController.searchStores);
router.get('/:id', storeController.getStoreById);
router.post('/', isSalesCaptain, storeController.createStore);
router.put('/:id', isSalesCaptain, storeController.updateStore);
router.delete('/:id', isAdmin, storeController.deleteStore);

// Store margins
router.get('/:id/margins', storeController.getStoreMargins);
router.post('/:id/margins', isSalesCaptain, storeController.setStoreMargin);

export default router;
