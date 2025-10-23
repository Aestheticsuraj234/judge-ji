import express from 'express';
import {serve} from "inngest/express";
import { inngest , functions } from './inngest/inngest';
import prisma from './lib/db';

import languageRoutes from "./routes/language.routes";
import submissionRoutes from "./routes/submission.routes";
const app = express();


app.use(express.json());

// Body parser error handler: return a friendly 400 when JSON is invalid
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next(err);
});

app.get('/', async (req, res) => {
  res.json({ message: 'Hello from Express + TypeScript + Prisma!' });
});

app.use("/api/inngest" , serve({client:inngest , functions}))
app.use('/api/submission' , submissionRoutes )
app.use("/api/languages" , languageRoutes)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Ensure standard statuses exist in the DB on startup to avoid FK violations
async function ensureStatuses() {
  const statusNames = [
    'In Queue', // desired default
    'Processing',
    'Completed',
    'Wrong Answer',
    'Time Limit Exceeded',
    'Compile Error',
    'Runtime Error',
  ];

  for (const name of statusNames) {
    const existing = await prisma.status.findFirst({ where: { name } });
    if (!existing) {
      await prisma.status.create({ data: { name } });
    }
  }
}

// Run without awaiting to avoid blocking startup, but log errors
ensureStatuses().catch(err => console.error('Failed to ensure statuses:', err));
