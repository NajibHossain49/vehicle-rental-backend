import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthUser } from '../types';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization token missing' });
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as AuthUser;

    if (typeof decoded.id !== 'number' || typeof decoded.email !== 'string') {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
