// src/services/dockerRunner.service.ts
import Docker from 'dockerode';
import { randomBytes } from 'crypto';

const docker = new Docker();

interface ExecutionResult {
  stdout: string;
  stderr: string;
  time: number; // in seconds
  memory: number; // in KB
  exitCode: number | null;
  error?: string;
}

export class DockerRunner {
  static async run(
    sourceCode: string,
    languageId: number,
    stdin: string = '',
    config: {
      cpuTimeLimit: number;
      memoryLimit: number; // in MB
      wallTimeLimit: number;
    }
  ): Promise<ExecutionResult> {
    // Map language_id to Docker image and commands
    const languageConfig = await this.getLanguageConfig(languageId);
    if (!languageConfig) {
      return { stdout: '', stderr: 'Language not supported', time: 0, memory: 0, exitCode: 1 };
    }

    const { image, compileCmd, runCmd, fileName, compileFirst } = languageConfig;

    const containerName = `judgeji-${randomBytes(8).toString('hex')}`;
    const timeoutMs = config.wallTimeLimit * 1000 + 5000; // extra 5s buffer

    let stdout = '';
    let stderr = '';
    let exitCode: number | null = 1;
    let execTime = 0;
    let memoryUsed = 0;

    const startTime = Date.now();

    try {
      // Create container
      const container = await docker.createContainer({
        Image: image,
        name: containerName,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        OpenStdin: true,
        StdinOnce: true,
        HostConfig: {
          Memory: config.memoryLimit * 1024 * 1024, // Convert MB to bytes
          CpuQuota: config.cpuTimeLimit * 100000, // 1s = 100000us
          NetworkMode: 'none', // Disable network unless enabled
        },
      });

      // Write source code
      await container.putArchive(
        this.createTarArchive({ [fileName]: sourceCode }),
        { path: '/' }
      );

      // Execute compile step (if needed)
      if (compileFirst && compileCmd) {
        const compileExec = await container.exec({
          Cmd: compileCmd.split(' '),
          AttachStdout: true,
          AttachStderr: true,
        });

        const compileStream = await compileExec.start({});
        const compileOutput = await this.streamToString(compileStream);

        if (compileOutput.stderr) {
          await container.remove();
          return {
            stdout: '',
            stderr: compileOutput.stderr,
            time: Date.now() - startTime,
            memory: 0,
            exitCode: 1,
          };
        }
      }

      // Run program
      const runExec = await container.exec({
        Cmd: runCmd.split(' '),
        AttachStdout: true,
        AttachStderr: true,
      });

      const runStream = await runExec.start({});
      const output = await this.streamToStringWithTimeout(runStream, timeoutMs);

      stdout = output.stdout;
      stderr = output.stderr;

      const execResult = await runExec.inspect();
      exitCode = execResult.ExitCode;

      // Capture stats
      const stats = await container.stats({ stream: false });
      memoryUsed = Math.floor(stats.memory_stats.usage / 1024); // Convert bytes to KB

      execTime = Date.now() - startTime;

      await container.remove();
    } catch (err: any) {
      stderr = `Execution error: ${err.message}`;
      execTime = Date.now() - startTime;
    }

    return {
      stdout,
      stderr,
      time: execTime / 1000,
      memory: memoryUsed,
      exitCode,
    };
  }

  private static createTarArchive(files: { [key: string]: string }): Buffer {
    const tar = require('tar-stream').pack();
    for (const [name, content] of Object.entries(files)) {
      tar.entry({ name }, content);
    }
    tar.finalize();
    return tar.read();
  }

  private static async streamToString(stream: any): Promise<{ stdout: string; stderr: string }> {
    let stdout = '';
    let stderr = '';
    const { PassThrough } = require('stream');

    return new Promise((resolve, reject) => {
      // If the stream already exposes a separate stderr stream, use it directly.
      if (stream && typeof stream.stderr?.on === 'function') {
        stream.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();
        });
        stream.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
        });
        stream.on('end', () => {
          resolve({ stdout, stderr });
        });
        stream.on('error', (err: Error) => reject(err));
        return;
      }

      // Otherwise, attempt to demux the Docker multiplexed stream into stdout/stderr.
      try {
        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();

        if (docker && docker.modem && typeof docker.modem.demuxStream === 'function') {
          docker.modem.demuxStream(stream, stdoutStream, stderrStream);
        } else {
          // Fallback: treat all data as stdout if demux not available.
          stream.on('data', (chunk: Buffer) => {
            stdout += chunk.toString();
          });
          stream.on('end', () => resolve({ stdout, stderr }));
          stream.on('error', (err: Error) => reject(err));
          return;
        }

        stdoutStream.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();
        });
        stderrStream.on('data', (chunk: Buffer) => {
          stderr += chunk.toString();
        });

        let ended = 0;
        const onEnd = () => {
          ended += 1;
          if (ended >= 2) resolve({ stdout, stderr });
        };
        stdoutStream.on('end', onEnd);
        stderrStream.on('end', onEnd);

        stream.on('error', (err: Error) => reject(err));
      } catch (err) {
        // Final fallback: collect all as stdout
        stream.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();
        });
        stream.on('end', () => resolve({ stdout, stderr }));
        stream.on('error', (e: Error) => reject(e));
      }
    });
  }

  private static async streamToStringWithTimeout(stream: NodeJS.ReadableStream, timeoutMs: number) {
    const timer = setTimeout(() => {
      // Call destroy if available (Node.js streams); fall back to cancel if present (web streams).
      if (typeof (stream as any).destroy === 'function') {
        (stream as any).destroy(new Error('Timeout'));
      } else if (typeof (stream as any).cancel === 'function') {
        (stream as any).cancel(new Error('Timeout'));
      }
    }, timeoutMs);

    try {
      const result = await this.streamToString(stream);
      clearTimeout(timer);
      return result;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  private static async getLanguageConfig(languageId: number) {
    const configs: Record<number, {
      image: string;
      compileCmd?: string;
      runCmd: string;
      fileName: string;
      compileFirst: boolean;
    }> = {
      71: { // Python 3.8
        image: 'python:3.8-slim',
        runCmd: 'python3 main.py',
        fileName: 'main.py',
        compileFirst: false,
      },
      4: { // C (gcc 7.2.0)
        image: 'gcc:7.2.0',
        compileCmd: 'gcc -o a.out main.c',
        runCmd: './a.out',
        fileName: 'main.c',
        compileFirst: true,
      },
      73: { // Rust
        image: 'rust:1.40',
        compileCmd: 'rustc main.rs',
        runCmd: './main',
        fileName: 'main.rs',
        compileFirst: true,
      },
  
      
    };

    return configs[languageId];
  }
}
