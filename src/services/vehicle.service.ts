import db from '../db';
import { removeUploadedFile } from '../middlewares/upload.middleware';
import type { UpdateVehicleRequestBody, Vehicle, VehicleListQuery, VehicleRequestBody } from '../types';

export type VehicleResponse = Omit<Vehicle, 'daily_rate'> & { daily_rate: number };

export interface PaginatedVehicles {
  data: VehicleResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function mapVehicle(vehicle: Vehicle): VehicleResponse {
  return {
    ...vehicle,
    daily_rate: Number(vehicle.daily_rate),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '23505'
  );
}

function httpError(statusCode: number, message: string): Error {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

export const vehicleService = {
  async getAllVehicles(query: VehicleListQuery): Promise<PaginatedVehicles> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));

    const filters = db<Vehicle>('vehicles').whereNull('deleted_at');

    if (query.category) {
      void filters.andWhereRaw('LOWER(category) = LOWER(?)', [query.category]);
    }

    if (query.search) {
      void filters.andWhereILike('name', `%${query.search}%`);
    }

    const countRow = await filters.clone().count<{ count: string }>('id as count').first();
    const total = Number(countRow?.count ?? 0);

    const vehicles = await filters
      .clone()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      data: vehicles.map(mapVehicle),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  },

  async getVehicleById(id: number): Promise<VehicleResponse | null> {
    const vehicle = await db<Vehicle>('vehicles').where({ id }).whereNull('deleted_at').first();
    return vehicle ? mapVehicle(vehicle) : null;
  },

  async createVehicle(input: VehicleRequestBody): Promise<VehicleResponse> {
    try {
      const [vehicle] = await db<Vehicle>('vehicles')
        .insert({
          name: input.name,
          plate_number: input.plate_number,
          category: input.category,
          daily_rate: input.daily_rate,
          photo_path: input.photo_path ?? null,
        })
        .returning('*');

      if (!vehicle) {
        throw httpError(500, 'Failed to create vehicle');
      }

      return mapVehicle(vehicle);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw httpError(409, 'Plate number already exists');
      }

      throw error;
    }
  },

  async updateVehicle(id: number, input: UpdateVehicleRequestBody): Promise<VehicleResponse | null> {
    const existing = await db<Vehicle>('vehicles').where({ id }).whereNull('deleted_at').first();

    if (!existing) {
      return null;
    }

    const updates: Partial<Vehicle> & { updated_at: Date } = {
      updated_at: db.fn.now() as unknown as Date,
    };

    if (input.name !== undefined) {
      updates.name = input.name;
    }
    if (input.plate_number !== undefined) {
      updates.plate_number = input.plate_number;
    }
    if (input.category !== undefined) {
      updates.category = input.category;
    }
    if (input.daily_rate !== undefined) {
      updates.daily_rate = input.daily_rate;
    }
    if (input.photo_path !== undefined) {
      updates.photo_path = input.photo_path;
    }

    try {
      const [vehicle] = await db<Vehicle>('vehicles').where({ id }).update(updates).returning('*');

      if (!vehicle) {
        return null;
      }

      if (input.photo_path && existing.photo_path && existing.photo_path !== input.photo_path) {
        removeUploadedFile(existing.photo_path);
      }

      return mapVehicle(vehicle);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw httpError(409, 'Plate number already exists');
      }

      throw error;
    }
  },

  async softDeleteVehicle(id: number): Promise<boolean> {
    const updated = await db<Vehicle>('vehicles')
      .where({ id })
      .whereNull('deleted_at')
      .update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    return updated > 0;
  },
};
