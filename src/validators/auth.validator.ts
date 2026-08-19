import type { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(1).required(),
});

export function validateLogin(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = loginSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    res.status(400).json({
      message: 'Validation failed',
      errors: error.details.map((detail) => detail.message),
    });
    return;
  }

  req.body = value;
  next();
}
