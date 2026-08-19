import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { uploadDir } from './middlewares/upload.middleware';
import authRoutes from './routes/auth.routes';
import vehicleRoutes from './routes/vehicle.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.use('/auth', authRoutes);
app.use('/vehicles', vehicleRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? 'Internal server error' : err.message,
  });
});

export default app;
