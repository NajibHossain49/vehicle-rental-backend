import type { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { removeUploadedFile } from '../middlewares/upload.middleware';

const vehicleFields = {
  name: Joi.string().trim().min(1).max(255),
  plate_number: Joi.string().trim().min(1).max(50),
  category: Joi.string().trim().min(1).max(100),
  daily_rate: Joi.number().positive().precision(2),
};

const createVehicleSchema = Joi.object({
  name: vehicleFields.name.required(),
  plate_number: vehicleFields.plate_number.required(),
  category: vehicleFields.category.required(),
  daily_rate: vehicleFields.daily_rate.required(),
});

const updateVehicleSchema = Joi.object({
  name: vehicleFields.name,
  plate_number: vehicleFields.plate_number,
  category: vehicleFields.category,
  daily_rate: vehicleFields.daily_rate,
}).min(0);

function sendValidationError(req: Request, res: Response, messages: string[]): void {
  if (req.file) {
    removeUploadedFile(req.file.filename);
  }

  res.status(400).json({
    message: 'Validation failed',
    errors: messages,
  });
}

export function validateCreateVehicle(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = createVehicleSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    sendValidationError(
      req,
      res,
      error.details.map((detail) => detail.message),
    );
    return;
  }

  req.body = value;
  next();
}

export function validateUpdateVehicle(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = updateVehicleSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    sendValidationError(
      req,
      res,
      error.details.map((detail) => detail.message),
    );
    return;
  }

  req.body = value;
  next();
}

export function validateVehicleId(req: Request, res: Response, next: NextFunction): void {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ message: 'Invalid vehicle ID' });
    return;
  }

  next();
}
