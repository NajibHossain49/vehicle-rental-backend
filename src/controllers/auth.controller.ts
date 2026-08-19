import type { NextFunction, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import type { LoginRequestBody } from '../types';

export async function login(
  req: Request<unknown, unknown, LoginRequestBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    if (!result) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    res.status(200).json({
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}
