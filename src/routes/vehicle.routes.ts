import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadVehiclePhoto } from '../middlewares/upload.middleware';
import {
  validateCreateVehicle,
  validateUpdateVehicle,
  validateVehicleId,
} from '../validators/vehicle.validator';

const router = Router();

router.use(authMiddleware);

router.get('/', vehicleController.getAll);
router.get('/:id', validateVehicleId, vehicleController.getById);
router.post('/', uploadVehiclePhoto, validateCreateVehicle, vehicleController.create);
router.put('/:id', validateVehicleId, uploadVehiclePhoto, validateUpdateVehicle, vehicleController.update);
router.delete('/:id', validateVehicleId, vehicleController.softDelete);

export default router;
