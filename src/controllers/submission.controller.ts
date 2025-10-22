// src/controllers/submission.controller.ts
import { Request, Response } from "express";
import prisma from "../lib/db";
import { Prisma } from "@prisma/client";
import { inngest, SubmissionStatus } from "../inngest/inngest";
import { z } from 'zod';
import { randomBytes } from 'crypto';

// Define input schema
const createSubmissionBodySchema = z.object({
  source_code: z.string().min(1, "Source code is required"),
  language_id: z.number().min(1, "Language ID is required"),
  stdin: z.string().optional(),
  expected_output: z.string().optional(),
  command_line_arguments: z.string().max(512).optional(),
  cpu_time_limit: z.number().positive().max(15).optional(),
  cpu_extra_time: z.number().positive().max(5).optional(),
  wall_time_limit: z.number().positive().max(20).optional(),
  memory_limit: z.number().int().positive().max(256000).optional(),
  stack_limit: z.number().int().min(0).max(128000).optional(),
  max_processes_and_or_threads: z.number().int().min(1).max(120).optional(),
  enable_per_process_and_thread_time_limit: z.boolean().optional(),
  enable_per_process_and_thread_memory_limit: z.boolean().optional(),
  max_file_size: z.number().int().min(0).max(4096).optional(),
  redirect_stderr_to_stdout: z.boolean().optional(),
  enable_network: z.boolean().optional(),
  number_of_runs: z.number().int().min(1).max(20).optional(),
  base64_encoded: z.boolean().optional().default(false),
  callback_url: z.string().url().optional(),
  additional_files: z.string().optional(), // Base64-encoded .zip content
});

// Export for reuse
export const createSubmissionSchema = z.object({
  body: createSubmissionBodySchema,
});

type SubmissionInput = z.infer<typeof createSubmissionBodySchema>;

// Helper: Decode Base64 if requested
function decodeIfBase64(value: string | undefined, enabled: boolean): string | undefined {
  if (!enabled || !value) return value;
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    throw new Error('Invalid Base64 encoding');
  }
}

// Helper: Decode additional_files to Buffer
function decodeAdditionalFiles(base64Zip: string | undefined): Buffer | null {
  if (!base64Zip) return null;
  try {
    return Buffer.from(base64Zip, 'base64');
  } catch {
    throw new Error('Invalid Base64 encoding for additional_files');
  }
}

export const createSubmission = async (req: Request, res: Response) => {
  try {
   
    const validationResult = createSubmissionSchema.safeParse({ body: req.body });

    if (!validationResult.success) {
      return res.status(422).json(
        validationResult.error.issues.map(issue => ({
          [issue.path[issue.path.length - 1]]: [issue.message]
        }))
      );
    }

    const body = validationResult.data.body as SubmissionInput;
    const isBase64Encoded = (req.query.base64_encoded === 'true') || body.base64_encoded;


    const decodedSourceCode = decodeIfBase64(body.source_code, isBase64Encoded);
    const decodedStdin = decodeIfBase64(body.stdin, isBase64Encoded);
    const decodedExpectedOutput = decodeIfBase64(body.expected_output, isBase64Encoded);
    const additionalFilesBuffer = body.additional_files 
      ? decodeAdditionalFiles(body.additional_files) 
      : null;

   
    const language = await prisma.language.findUnique({
      where: { id: body.language_id }
    });

    if (!language) {
      return res.status(422).json({
        language_id: [`language with id ${body.language_id} doesn't exist`]
      });
    }

    if (language.is_archived) {
      return res.status(422).json({
        language_id: [`language with id ${body.language_id} is archived and cannot be used anymore`]
      });
    }

    
    const token = `sub_${randomBytes(16).toString('hex')}`;

   
    // Ensure there's a status row for "In Queue" and use its id to avoid FK issues
    let inQueueStatus = await prisma.status.findFirst({ where: { name: 'In Queue' } });
    if (!inQueueStatus) {
      inQueueStatus = await prisma.status.create({ data: { name: 'In Queue' } });
    }

    const submission = await prisma.submission.create({
      data: {
        token,

        // Prisma JSON accepts strings; store the decoded source as a string or JsonNull
        source_code: decodedSourceCode ?? Prisma.JsonNull,
        language_id: body.language_id,
        stdin: decodedStdin || null,
        expected_output: decodedExpectedOutput || null,
        command_line_arguments: body.command_line_arguments || null,
        compiler_options: Prisma.JsonNull,
        callback_url: body.callback_url || null,
        // `additional_files` is Bytes in Prisma; Buffer is acceptable
        additional_files: additionalFilesBuffer,

        // Status and timestamps
        status_id: inQueueStatus.id,
        created_at: new Date(),
        queued_at: new Date(),
      }
    });

    // Send event to Inngest for background processing
    await inngest.send({
      name: SubmissionStatus.PROCESSING,
      data: {
        submissionId: submission.id
      }
    });

    // Return 201 with token
    return res.status(201).json({
      token: submission.token
    });

  } catch (error: any) {
    console.error('Submission creation failed:', error);

    // Handle known errors
    if (error.message?.includes('Base64')) {
      return res.status(422).json({
        error: 'Invalid Base64 encoding in source_code, stdin, expected_output, or additional_files'
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'Internal server error during submission processing'
    });
  }
};
