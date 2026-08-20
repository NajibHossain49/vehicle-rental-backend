import cors from 'cors';
import express from 'express';
import { uploadDir } from './config/env';
import authRoutes from './routes/auth.routes';
import rentalRoutes from './routes/rental.routes';
import reportRoutes from './routes/report.routes';
import vehicleRoutes from './routes/vehicle.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.use('/auth', authRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/rentals', rentalRoutes);
app.use('/reports', reportRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? 'Internal server error' : err.message,
  });
});

export default app;
