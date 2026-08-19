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
