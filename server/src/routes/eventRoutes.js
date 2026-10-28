import { Router } from 'express';
import { eventController } from '../controllers/eventController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', eventController.getAllEvents);
router.post('/', eventController.createEvent);
router.get('/:eventId', eventController.getEventById);
router.delete('/:eventId', eventController.deleteEvent);

export default router;
