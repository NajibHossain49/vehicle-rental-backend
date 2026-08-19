import type { NextFunction, Request, Response } from 'express';
import { rentalService } from '../services/rental.service';
import type { RentalRequestBody, RentalStatus, UpdateRentalRequestBody } from '../types';

function isConflict(error: unknown): error is Error & { statusCode: 409 } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode: number }).statusCode === 409
  );
}

function parsePositiveInt(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseStatus(value: unknown): RentalStatus | undefined {
  if (
    value === 'booked' ||
    value === 'ongoing' ||
    value === 'completed' ||
    value === 'cancelled'
  ) {
    return value;
  }

  return undefined;
}

function parseDateQuery(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export class RentalController {
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await rentalService.getAllRentals({
        page: parsePositiveInt(req.query.page) ?? 1,
        limit: parsePositiveInt(req.query.limit) ?? 10,
        vehicle_id: parsePositiveInt(req.query.vehicle_id),
        status: parseStatus(req.query.status),
        start_date: parseDateQuery(req.query.start_date),
        end_date: parseDateQuery(req.query.end_date),
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rental = await rentalService.getRentalById(Number(req.params.id));

      if (!rental) {
        res.status(404).json({ message: 'Rental not found' });
        return;
      }

      res.status(200).json({ data: rental });
    } catch (error) {
      next(error);
    }
  };

  create = async (
    req: Request<object, unknown, RentalRequestBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const rental = await rentalService.createRental(req.body);

      res.status(201).json({
        message: 'Rental created',
        data: rental,
      });
    } catch (error) {
      if (isConflict(error)) {
        res.status(409).json({ message: error.message });
        return;
      }

      next(error);
    }
  };

  update = async (
    req: Request<{ id: string }, unknown, UpdateRentalRequestBody>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const rental = await rentalService.updateRental(Number(req.params.id), req.body);

      if (!rental) {
        res.status(404).json({ message: 'Rental not found' });
        return;
      }

      res.status(200).json({
        message: 'Rental updated',
        data: rental,
      });
    } catch (error) {
      if (isConflict(error)) {
        res.status(409).json({ message: error.message });
        return;
      }

      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deleted = await rentalService.deleteRental(Number(req.params.id));

      if (!deleted) {
        res.status(404).json({ message: 'Rental not found' });
        return;
      }

      res.status(200).json({ message: 'Rental cancelled' });
    } catch (error) {
      next(error);
    }
  };
}

export const rentalController = new RentalController();
