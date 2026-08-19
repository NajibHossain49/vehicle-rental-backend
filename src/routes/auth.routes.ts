import { Router } from 'express';
import { login } from '../controllers/auth.controller';
import { validateLogin } from '../validators/auth.validator';

const router = Router();

router.post('/login', validateLogin, login);

export default router;
