import type { NextFunction, Request, Response } from 'express';
import { reportService } from '../services/report.service';

function parseMonth(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseVehicleId(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export class ReportController {
  getMonthlyRentals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportService.getMonthlyRentalReport(
        parseMonth(req.query.month),
        parseVehicleId(req.query.vehicle_id),
      );

      res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  };
}

export const reportController = new ReportController();
