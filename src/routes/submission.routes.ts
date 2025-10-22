import { Router, Request, Response } from "express";
import { createSubmissionSchema } from "../schemas/submission.schema";

import axios from "axios";
import prisma from "../lib/db";
import { validateRequest } from "../middleware/validatee.middleware";
import { createSubmission } from "../controllers/submission.controller";

const router = Router();

router.post(
    "/",
    validateRequest(createSubmissionSchema),
   createSubmission
)

export default router