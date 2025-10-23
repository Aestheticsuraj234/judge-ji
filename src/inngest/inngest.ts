import prisma from "../lib/db";
import { DockerRunner } from "../services/dockerRunner.service";
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "my-app" });

export enum SubmissionStatus {
  PENDING = "submission.pending",
  PROCESSING = "submission.processing",
  COMPLETED = "submission.completed",
  FAILED = "submission.failed",
}

export const processSubmission = inngest.createFunction(
  { id: "process-submission" },
  { event: SubmissionStatus.PROCESSING },
  async ({ event, step }) => {
    const { submissionId } = event.data;

    const submission = await step.run("fetch-submission", async () => {
      return await prisma.submission.findFirstOrThrow({
        where: {
          id: submissionId,
        },
      });
    });

    const languageId = submission?.language_id as number;
    const cpuTimeLimit = 2;
    const memoryLimit = Math.floor(
      ((submission?.memory as number) || 128000) / 1024
    );
    const wallTimeLimit = submission?.wall_time as number;

    await step.run("update-status-processing", async () => {
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status_id: 2,
          started_at: new Date(),
        },
      });
    });

    const result = await step.run("execute-in-docker" , async()=>{
      return await DockerRunner.run(
        submission?.source_code?.toString() || "",
        languageId,
        submission.stdin || "",
        {
          cpuTimeLimit,
          memoryLimit,
          wallTimeLimit,
        }
      )
    })

    let status_id = 3;
     if (result.exitCode !== 0) {
      status_id = result.stderr.includes('timeout') ? 5 : 6; // TLE or Compile Error
    } else if (submission.expected_output && result.stdout !== submission.expected_output) {
      status_id = 4; // Wrong Answer
    }

    await step.run("save-results" , async()=>{
      await prisma.submission.update({
        where:{id:submissionId},
        data:{
                stdout: result.stdout,
          stderr: result.stderr,
          time: result.time,
          memory: result.memory,
          exit_code: result.exitCode,
          status_id,
          message: result.error || null,
          finished_at: new Date(),
        }
      })
    })

      if (submission.callback_url) {
      await step.run('send-webhook', async () => {
        try {
          await fetch(submission.callback_url!, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: submission.token,
              stdout: result.stdout,
              stderr: result.stderr,
              time: result.time,
              memory: result.memory,
              status: { id: status_id },
            }),
          });
        } catch (err) {
          console.error('Webhook failed:', err);
        }
      });
    }

    return { success: true, status_id, output: result.stdout };
  }
);

export const functions = [processSubmission];
