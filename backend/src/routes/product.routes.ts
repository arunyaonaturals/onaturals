import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, isAdmin, isSalesCaptain } from '../middleware/auth.middleware';

const router = Router();
const productController = new ProductController();

// All routes require authentication
router.use(authenticate);

// Product CRUD
router.get('/', productController.getAllProducts);
router.get('/search', productController.searchProducts);
router.get('/:id', productController.getProductById);
router.post('/', isAdmin, productController.createProduct);
router.put('/:id', isAdmin, productController.updateProduct);
router.delete('/:id', isAdmin, productController.deleteProduct);

// Product categories
router.get('/categories/list', productController.getCategories);
router.post('/categories', isAdmin, productController.createCategory);

export default router;
