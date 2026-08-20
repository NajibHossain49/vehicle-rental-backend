import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
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

    const payload: AuthUser = { id: staff.id, email: staff.email };
    const options: SignOptions = {
      expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'],
    };

    const token = jwt.sign(payload, env.jwt.secret, options);

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
