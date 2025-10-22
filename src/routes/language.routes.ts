import prisma from '../lib/db';
import { Router } from 'express';


const router = Router();


router.get('/', async (req, res) => {
  const languages = await prisma.language.findMany({
    where: { is_archived: false },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  res.json(languages);
});


router.get('/all', async (req, res) => {
  const languages = await prisma.language.findMany({
    select: { id: true, name: true, is_archived: true },
    orderBy: { id: 'asc' }
  });
  res.json(languages);
});


// by id
router.get('/:id', async (req, res) => {
  const language = await prisma.language.findUnique({
    where: { id: Number(req.params.id) },
    select: { id: true, name: true, is_archived: true }
  });
  res.json(language);
});

export default router;
