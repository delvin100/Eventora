import { Router } from 'express';
import { resultController } from '../controllers/resultController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', resultController.getEventResults);
router.post('/', resultController.createResult);
router.delete('/:resultId', resultController.deleteResult);

export default router;
