import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './modules/auth/auth.routes';
import businessRoutes from './modules/business/business.routes';
import clientRoutes from './modules/clients/client.routes';
import productRoutes from './modules/products/product.routes';
import saleRoutes from './modules/sales/sale.routes';
import quoteRoutes from './modules/quotes/quote.routes';
import guideRoutes from './modules/guides/guide.routes';
import cashboxRoutes from './modules/cashbox/cashbox.routes';
import expenseRoutes from './modules/expenses/expense.routes';
import reportRoutes from './modules/reports/report.routes';
import settingsRoutes from './modules/settings/settings.routes';
import userRoutes from './modules/users/user.routes';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/cashbox', cashboxRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
