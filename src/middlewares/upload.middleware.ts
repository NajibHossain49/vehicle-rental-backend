import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import multer, { MulterError } from 'multer';
import path from 'path';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_PATH || 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TYPES[file.mimetype] ?? '.jpg';
    cb(null, `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(null, true);
      return;
    }

    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  },
});

export function removeUploadedFile(photoPathOrName: string): void {
  const filename = path.basename(photoPathOrName);
  if (!filename) {
    return;
  }

  fs.unlink(path.join(uploadDir, filename), () => undefined);
}

export function uploadVehiclePhoto(req: Request, res: Response, next: NextFunction): void {
  upload.single('photo')(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller' : err.message;
      res.status(400).json({ message });
      return;
    }

    if (err instanceof Error) {
      res.status(400).json({ message: err.message });
      return;
    }

    next();
  });
}
