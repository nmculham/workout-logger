import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db/sqlite';
import workoutsRouter from './routes/workouts';
import exercisesRouter from './routes/exercises';
import setsRouter from './routes/sets';
import syncRouter from './routes/sync';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Init DB
initDb();

// Routes
app.use('/api/workouts', workoutsRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/sets', setsRouter);
app.use('/api/sync', syncRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
