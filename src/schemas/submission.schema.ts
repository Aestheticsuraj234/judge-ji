import { z } from 'zod';

export const createSubmissionSchema = z.object({
  body: z.object({
    source_code: z.string().min(1, "Source code is required"),
    language_id: z.number().int().positive("Language ID must be a positive integer"),
    stdin: z.string().optional(),
    expected_output: z.string().optional(),
    compile_output: z.string().optional(),
    command_line_arguments: z.string().optional(),
    callback_url: z.url().optional(),
    cpu_time_limit: z.number().positive().max(15).optional(),
    cpu_extra_time: z.number().positive().max(2).optional(),
    wall_time_limit: z.number().positive().max(20).optional(),
    memory_limit: z.number().int().positive().max(256000).optional(),
    stack_limit: z.number().int().positive().max(128000).optional(),
    max_processes_and_or_threads: z.number().int().positive().max(120).optional(),
    enable_per_process_and_thread_time_limit: z.boolean().optional(),
    enable_per_process_and_thread_memory_limit: z.boolean().optional(),
    max_file_size: z.number().int().positive().max(4096).optional(),
    redirect_stderr_to_stdout: z.boolean().optional(),
    enable_network: z.boolean().optional(),
    number_of_runs: z.number().int().positive().max(20).optional(),
    base64_encoded: z.boolean().optional().default(false),
    additional_files: z.string().optional() 
  })
});
