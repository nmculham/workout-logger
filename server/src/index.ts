import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db/postgres';
import { requireAuth } from './middleware/auth';
import workoutsRouter from './routes/workouts';
import exercisesRouter from './routes/exercises';
import setsRouter from './routes/sets';
import templatesRouter from './routes/templates';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(requireAuth);

app.use('/api/workouts', workoutsRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/sets', setsRouter);
app.use('/api/templates', templatesRouter);

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to connect to database:', err);
  process.exit(1);
});
