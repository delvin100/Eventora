import { Router } from 'express';
import { participantController } from '../controllers/participantController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', participantController.getParticipants);
router.post('/', participantController.addParticipant);
router.post('/bulk', participantController.bulkAddParticipants);
router.delete('/:participantId', participantController.deleteParticipant);

export default router;
