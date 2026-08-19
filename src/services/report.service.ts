import db from '../db';

export interface VehicleReportRow {
  id: number;
  name: string;
  total_bookings: number;
  days_rented: number;
  revenue: number;
}

export interface MonthlyRentalReport {
  month: string;
  vehicles: VehicleReportRow[];
  highest_revenue_vehicle: VehicleReportRow | null;
}

interface RawVehicleReportRow {
  id: number;
  name: string;
  total_bookings: string | number;
  days_rented: string | number;
  revenue: string | number;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function httpError(statusCode: number, message: string): Error {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function currentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function mapRow(row: RawVehicleReportRow): VehicleReportRow {
  return {
    id: Number(row.id),
    name: row.name,
    total_bookings: Number(row.total_bookings),
    days_rented: Number(row.days_rented),
    revenue: Number(Number(row.revenue).toFixed(2)),
  };
}

export const reportService = {
  async getMonthlyRentalReport(month?: string, vehicleId?: number): Promise<MonthlyRentalReport> {
    const selectedMonth = month && month.trim().length > 0 ? month : currentMonth();

    if (!MONTH_PATTERN.test(selectedMonth)) {
      throw httpError(400, 'month must be in YYYY-MM format');
    }

    const monthStart = `${selectedMonth}-01`;
    const bindings: Array<string | number> = [monthStart, monthStart];

    let vehicleFilter = '';
    if (vehicleId !== undefined) {
      vehicleFilter = 'AND v.id = ?';
      bindings.push(vehicleId);
    }

    const { rows } = await db.raw<{ rows: RawVehicleReportRow[] }>(
      `
      WITH params AS (
        SELECT
          ?::date AS month_start,
          (?::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS month_end
      )
      SELECT
        v.id,
        v.name,
        COUNT(r.id)::int AS total_bookings,
        SUM(
          (LEAST(r.end_date, p.month_end) - GREATEST(r.start_date, p.month_start) + 1)
        )::int AS days_rented,
        ROUND(
          SUM(
            v.daily_rate * (LEAST(r.end_date, p.month_end) - GREATEST(r.start_date, p.month_start) + 1)
          ),
          2
        ) AS revenue
      FROM params p
      INNER JOIN rentals r
        ON r.status <> 'cancelled'
       AND r.start_date <= p.month_end
       AND r.end_date >= p.month_start
      INNER JOIN vehicles v
        ON v.id = r.vehicle_id
      WHERE 1 = 1
        ${vehicleFilter}
      GROUP BY v.id, v.name
      ORDER BY revenue DESC, v.name ASC
      `,
      bindings,
    );

    const vehicles = rows.map(mapRow);

    return {
      month: selectedMonth,
      vehicles,
      highest_revenue_vehicle: vehicles[0] ?? null,
    };
  },
};
