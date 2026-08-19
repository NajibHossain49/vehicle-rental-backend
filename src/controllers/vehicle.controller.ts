import type { NextFunction, Request, Response } from 'express';
import { removeUploadedFile } from '../middlewares/upload.middleware';
import { vehicleService } from '../services/vehicle.service';
import type { UpdateVehicleRequestBody, VehicleRequestBody } from '../types';

function photoPathFromRequest(req: { file?: Express.Multer.File }): string | undefined {
  return req.file ? `/uploads/${req.file.filename}` : undefined;
}

function cleanupNewUpload(req: { file?: Express.Multer.File }): void {
  if (req.file) {
    removeUploadedFile(req.file.filename);
  }
}

export class VehicleController {
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page);
      const limit = Number(req.query.limit);

      const result = await vehicleService.getAllVehicles({
        page: Number.isInteger(page) && page > 0 ? page : 1,
        limit: Number.isInteger(limit) && limit > 0 ? limit : 10,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vehicle = await vehicleService.getVehicleById(Number(req.params.id));

      if (!vehicle) {
        res.status(404).json({ message: 'Vehicle not found' });
        return;
      }

      res.status(200).json({ data: vehicle });
    } catch (error) {
      next(error);
    }
  };

  create = async (
    req: Request<object, unknown, VehicleRequestBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const vehicle = await vehicleService.createVehicle({
        ...req.body,
        photo_path: photoPathFromRequest(req) ?? null,
      });

      res.status(201).json({
        message: 'Vehicle created',
        data: vehicle,
      });
    } catch (error) {
      cleanupNewUpload(req);
      next(error);
    }
  };

  update = async (
    req: Request<{ id: string }, unknown, UpdateVehicleRequestBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const photoPath = photoPathFromRequest(req);
      const vehicle = await vehicleService.updateVehicle(Number(req.params.id), {
        ...req.body,
        ...(photoPath ? { photo_path: photoPath } : {}),
      });

      if (!vehicle) {
        cleanupNewUpload(req);
        res.status(404).json({ message: 'Vehicle not found' });
        return;
      }

      res.status(200).json({
        message: 'Vehicle updated',
        data: vehicle,
      });
    } catch (error) {
      cleanupNewUpload(req);
      next(error);
    }
  };

  softDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deleted = await vehicleService.softDeleteVehicle(Number(req.params.id));

      if (!deleted) {
        res.status(404).json({ message: 'Vehicle not found' });
        return;
      }

      res.status(200).json({ message: 'Vehicle deleted' });
    } catch (error) {
      next(error);
    }
  };
}

export const vehicleController = new VehicleController();
