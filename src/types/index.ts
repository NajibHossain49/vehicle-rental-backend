import 'express';

export type RentalStatus = 'booked' | 'ongoing' | 'completed' | 'cancelled';

export interface AuthUser {
  id: number;
  email: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface VehicleRequestBody {
  name: string;
  plate_number: string;
  category: string;
  daily_rate: number;
  photo_path?: string | null;
}

export type UpdateVehicleRequestBody = Partial<VehicleRequestBody>;

export interface Vehicle {
  id: number;
  name: string;
  plate_number: string;
  category: string;
  daily_rate: string | number;
  photo_path: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface VehicleListQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

export interface RentalRequestBody {
  vehicle_id: number;
  customer_name: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status?: RentalStatus;
}

export interface Staff {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
