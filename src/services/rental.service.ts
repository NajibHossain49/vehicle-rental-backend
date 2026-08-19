import type { Knex } from 'knex';
import db from '../db';
import type {
  Rental,
  RentalListQuery,
  RentalRequestBody,
  RentalStatus,
  RentalVehicleDetails,
  UpdateRentalRequestBody,
  Vehicle,
} from '../types';

const ACTIVE_RENTAL_STATUSES: RentalStatus[] = ['booked', 'ongoing'];

export interface RentalResponse {
  id: number;
  vehicle_id: number;
  customer_name: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: RentalStatus;
  created_at: Date;
  updated_at: Date;
  vehicle?: RentalVehicleDetails;
}

export interface PaginatedRentals {
  data: RentalResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function httpError(statusCode: number, message: string): Error {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function formatDate(value: string | Date): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapRental(rental: Rental, vehicle?: RentalVehicleDetails): RentalResponse {
  return {
    id: rental.id,
    vehicle_id: rental.vehicle_id,
    customer_name: rental.customer_name,
    customer_phone: rental.customer_phone,
    start_date: formatDate(rental.start_date),
    end_date: formatDate(rental.end_date),
    total_amount: Number(rental.total_amount),
    status: rental.status,
    created_at: rental.created_at,
    updated_at: rental.updated_at,
    ...(vehicle ? { vehicle } : {}),
  };
}

export function calculateTotalAmount(
  daily_rate: string | number,
  start_date: string,
  end_date: string,
): number {
  const start = Date.parse(`${start_date}T00:00:00Z`);
  const end = Date.parse(`${end_date}T00:00:00Z`);
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const billedDays = Number.isFinite(days) ? Math.max(1, days) : 1;

  return Number((Number(daily_rate) * billedDays).toFixed(2));
}

export async function checkDateOverlap(
  vehicle_id: number,
  start_date: string,
  end_date: string,
  exclude_rental_id?: number,
  trx?: Knex.Transaction,
): Promise<boolean> {
  const query = (trx ?? db)<Rental>('rentals')
    .where({ vehicle_id })
    .whereIn('status', ACTIVE_RENTAL_STATUSES)
    .andWhere('start_date', '<=', end_date)
    .andWhere('end_date', '>=', start_date);

  if (exclude_rental_id) {
    void query.whereNot('id', exclude_rental_id);
  }

  const overlapping = await query.first();
  return Boolean(overlapping);
}

async function getActiveVehicle(
  vehicleId: number,
  trx: Knex.Transaction | typeof db,
): Promise<Vehicle> {
  const vehicle = await trx<Vehicle>('vehicles')
    .where({ id: vehicleId })
    .whereNull('deleted_at')
    .first();

  if (!vehicle) {
    throw httpError(404, 'Vehicle not found');
  }

  return vehicle;
}

async function fetchRentalWithVehicle(
  id: number,
  trx?: Knex.Transaction,
): Promise<RentalResponse | null> {
  const row = await (trx ?? db)('rentals')
    .select(
      'rentals.*',
      'vehicles.id as joined_vehicle_id',
      'vehicles.name as vehicle_name',
      'vehicles.plate_number as vehicle_plate_number',
      'vehicles.category as vehicle_category',
      'vehicles.daily_rate as vehicle_daily_rate',
      'vehicles.photo_path as vehicle_photo_path',
    )
    .leftJoin('vehicles', 'rentals.vehicle_id', 'vehicles.id')
    .where('rentals.id', id)
    .first();

  if (!row) {
    return null;
  }

  const rental = row as Rental & {
    joined_vehicle_id?: number;
    vehicle_name?: string;
    vehicle_plate_number?: string;
    vehicle_category?: string;
    vehicle_daily_rate?: string | number;
    vehicle_photo_path?: string | null;
  };

  const vehicle =
    rental.joined_vehicle_id !== undefined && rental.joined_vehicle_id !== null
      ? {
          id: rental.joined_vehicle_id,
          name: rental.vehicle_name ?? '',
          plate_number: rental.vehicle_plate_number ?? '',
          category: rental.vehicle_category ?? '',
          daily_rate: Number(rental.vehicle_daily_rate ?? 0),
          photo_path: rental.vehicle_photo_path ?? null,
        }
      : undefined;

  return mapRental(rental, vehicle);
}

export const rentalService = {
  checkDateOverlap,
  calculateTotalAmount,

  async getAllRentals(query: RentalListQuery): Promise<PaginatedRentals> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));

    const filters = db<Rental>('rentals');

    if (query.vehicle_id) {
      void filters.andWhere('vehicle_id', query.vehicle_id);
    }
    if (query.status) {
      void filters.andWhere('status', query.status);
    }
    if (query.start_date) {
      void filters.andWhere('start_date', '>=', query.start_date);
    }
    if (query.end_date) {
      void filters.andWhere('end_date', '<=', query.end_date);
    }

    const countRow = await filters.clone().count<{ count: string }>('id as count').first();
    const total = Number(countRow?.count ?? 0);

    const rentals = await filters
      .clone()
      .orderBy('start_date', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data: rentals.map((rental) => mapRental(rental)),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  },

  async getRentalById(id: number): Promise<RentalResponse | null> {
    return fetchRentalWithVehicle(id);
  },

  async createRental(input: RentalRequestBody): Promise<RentalResponse> {
    return db.transaction(async (trx) => {
      const vehicle = await trx<Vehicle>('vehicles')
        .where({ id: input.vehicle_id })
        .whereNull('deleted_at')
        .forUpdate()
        .first();

      if (!vehicle) {
        throw httpError(404, 'Vehicle not found');
      }

      const overlaps = await checkDateOverlap(
        input.vehicle_id,
        input.start_date,
        input.end_date,
        undefined,
        trx,
      );

      if (overlaps) {
        throw httpError(409, 'Vehicle is already booked for the selected dates');
      }

      const totalAmount = calculateTotalAmount(vehicle.daily_rate, input.start_date, input.end_date);

      const [rental] = await trx<Rental>('rentals')
        .insert({
          vehicle_id: input.vehicle_id,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          start_date: input.start_date,
          end_date: input.end_date,
          total_amount: totalAmount,
          status: input.status ?? 'booked',
        })
        .returning('*');

      if (!rental) {
        throw httpError(500, 'Failed to create rental');
      }

      const created = await fetchRentalWithVehicle(rental.id, trx);
      if (!created) {
        throw httpError(500, 'Failed to create rental');
      }

      return created;
    });
  },

  async updateRental(id: number, input: UpdateRentalRequestBody): Promise<RentalResponse | null> {
    return db.transaction(async (trx) => {
      const existing = await trx<Rental>('rentals').where({ id }).first();

      if (!existing) {
        return null;
      }

      const nextVehicleId = input.vehicle_id ?? existing.vehicle_id;
      const nextStartDate = input.start_date ?? formatDate(existing.start_date);
      const nextEndDate = input.end_date ?? formatDate(existing.end_date);
      const nextStatus = input.status ?? existing.status;

      if (nextEndDate < nextStartDate) {
        throw httpError(400, 'end_date must be on or after start_date');
      }

      const vehicle = await getActiveVehicle(nextVehicleId, trx);

      if (nextStatus === 'booked' || nextStatus === 'ongoing') {
        const overlaps = await checkDateOverlap(
          nextVehicleId,
          nextStartDate,
          nextEndDate,
          id,
          trx,
        );

        if (overlaps) {
          throw httpError(409, 'Vehicle is already booked for the selected dates');
        }
      }

      const shouldRecalculate =
        input.start_date !== undefined ||
        input.end_date !== undefined ||
        input.vehicle_id !== undefined;

      const updates: Partial<Rental> & { updated_at: Date } = {
        updated_at: db.fn.now() as unknown as Date,
      };

      if (input.vehicle_id !== undefined) {
        updates.vehicle_id = input.vehicle_id;
      }
      if (input.customer_name !== undefined) {
        updates.customer_name = input.customer_name;
      }
      if (input.customer_phone !== undefined) {
        updates.customer_phone = input.customer_phone;
      }
      if (input.start_date !== undefined) {
        updates.start_date = input.start_date;
      }
      if (input.end_date !== undefined) {
        updates.end_date = input.end_date;
      }
      if (input.status !== undefined) {
        updates.status = input.status;
      }
      if (shouldRecalculate) {
        updates.total_amount = calculateTotalAmount(vehicle.daily_rate, nextStartDate, nextEndDate);
      }

      await trx<Rental>('rentals').where({ id }).update(updates);

      return fetchRentalWithVehicle(id, trx);
    });
  },

  async deleteRental(id: number): Promise<boolean> {
    const updated = await db<Rental>('rentals').where({ id }).whereNot('status', 'cancelled').update({
      status: 'cancelled',
      updated_at: db.fn.now(),
    });

    if (updated > 0) {
      return true;
    }

    const existing = await db<Rental>('rentals').where({ id }).first();
    return Boolean(existing);
  },
};
