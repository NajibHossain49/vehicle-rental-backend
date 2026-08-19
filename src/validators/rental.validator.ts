import type { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

const dateOnly = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({ 'string.pattern.base': '{#label} must be a date in YYYY-MM-DD format' });

const rentalStatus = Joi.string().valid('booked', 'ongoing', 'completed', 'cancelled');

const rentalFields = {
  vehicle_id: Joi.number().integer().positive(),
  customer_name: Joi.string().trim().min(1).max(255),
  customer_phone: Joi.string().trim().min(3).max(30),
  start_date: dateOnly,
  end_date: dateOnly,
  status: rentalStatus,
};

function assertDateOrder(
  value: { start_date?: string; end_date?: string },
  helpers: Joi.CustomHelpers,
) {
  if (value.start_date && value.end_date && value.end_date < value.start_date) {
    return helpers.message({ custom: 'end_date must be on or after start_date' });
  }

  return value;
}

const createRentalSchema = Joi.object({
  vehicle_id: rentalFields.vehicle_id.required(),
  customer_name: rentalFields.customer_name.required(),
  customer_phone: rentalFields.customer_phone.required(),
  start_date: rentalFields.start_date.required(),
  end_date: rentalFields.end_date.required(),
  status: rentalFields.status,
}).custom(assertDateOrder);

const updateRentalSchema = Joi.object({
  vehicle_id: rentalFields.vehicle_id,
  customer_name: rentalFields.customer_name,
  customer_phone: rentalFields.customer_phone,
  start_date: rentalFields.start_date,
  end_date: rentalFields.end_date,
  status: rentalFields.status,
})
  .min(1)
  .custom(assertDateOrder);

function sendValidationError(res: Response, messages: string[]): void {
  res.status(400).json({
    message: 'Validation failed',
    errors: messages,
  });
}

export function validateCreateRental(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = createRentalSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    sendValidationError(
      res,
      error.details.map((detail) => detail.message),
    );
    return;
  }

  req.body = value;
  next();
}

export function validateUpdateRental(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = updateRentalSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    sendValidationError(
      res,
      error.details.map((detail) => detail.message),
    );
    return;
  }

  req.body = value;
  next();
}

export function validateRentalId(req: Request, res: Response, next: NextFunction): void {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ message: 'Invalid rental ID' });
    return;
  }

  next();
}
