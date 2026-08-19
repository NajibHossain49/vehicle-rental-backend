import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? 'Internal server error' : err.message,
  });
});

export default app;
