import { Router } from 'express';
import { rentalController } from '../controllers/rental.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  validateCreateRental,
  validateRentalId,
  validateUpdateRental,
} from '../validators/rental.validator';

const router = Router();

router.use(authMiddleware);

router.get('/', rentalController.getAll);
router.get('/:id', validateRentalId, rentalController.getById);
router.post('/', validateCreateRental, rentalController.create);
router.put('/:id', validateRentalId, validateUpdateRental, rentalController.update);
router.delete('/:id', validateRentalId, rentalController.remove);

export default router;
