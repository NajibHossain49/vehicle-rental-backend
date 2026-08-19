import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import db from '../db';
import type { AuthUser, Staff } from '../types';

export interface LoginResult {
  token: string;
  user: AuthUser & { name: string };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResult | null> {
    const staff = await db<Staff>('staff').where({ email }).first();

    if (!staff) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, staff.password_hash);
    if (!isMatch) {
      return null;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload: AuthUser = { id: staff.id, email: staff.email };
    const options: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as SignOptions['expiresIn'],
    };

    const token = jwt.sign(payload, secret, options);

    return {
      token,
      user: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
      },
    };
  },
};
