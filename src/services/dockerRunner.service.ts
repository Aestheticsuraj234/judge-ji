
import Docker from 'dockerode';
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';

const docker = new Docker();
const prisma = new PrismaClient();

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
    // Get language configuration from database
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

    let container: Docker.Container | null = null;
    try {
      // Create container
      container = await docker.createContainer({
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
          CpuQuota: Math.floor(0.5 * 100000), // example: 0.5 CPU
          NetworkMode: 'none', // Disable network unless enabled
        },
      });

      // Write source code
      await container.putArchive(
        this.createTarArchive({ [fileName as string]: sourceCode }),
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
        Cmd: runCmd?.split(' '),
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
    } finally {
      if (container) {
        try { await container.remove({ force: true }); } catch {}
      }
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
    try {
      // Fetch language from database
      const language = await prisma.language.findUnique({
        where: { id: languageId, is_archived: false },
      });

      if (!language) {
        return null;
      }

      // Map language to Docker image and configuration
      const imageMap: Record<string, string> = {
        // Assembly
        'Assembly (NASM 2.14.02)': 'nasm:2.14.02',
        
        // Bash
        'Bash (5.0.0)': 'bash:5.0',
        'Bash (4.4)': 'bash:4.4',
        
        // Basic
        'Basic (FBC 1.07.1)': 'freebasic:1.07.1',
        
        // C
        'C (GCC 7.4.0)': 'gcc:7.4.0',
        'C (GCC 8.3.0)': 'gcc:8.3.0',
        'C (GCC 9.2.0)': 'gcc:9.2.0',
        'C (gcc 7.2.0)': 'gcc:7.2.0',
        'C (gcc 6.4.0)': 'gcc:6.4.0',
        'C (gcc 5.4.0)': 'gcc:5.4.0',
        'C (gcc 4.9.4)': 'gcc:4.9.4',
        'C (gcc 4.8.5)': 'gcc:4.8.5',
        
        // C#
        'C# (Mono 6.6.0.161)': 'mono:6.6.0.161',
        
        // C++
        'C++ (GCC 7.4.0)': 'gcc:7.4.0',
        'C++ (GCC 8.3.0)': 'gcc:8.3.0',
        'C++ (GCC 9.2.0)': 'gcc:9.2.0',
        'C++ (g++ 7.2.0)': 'gcc:7.2.0',
        'C++ (g++ 6.4.0)': 'gcc:6.4.0',
        'C++ (g++ 6.3.0)': 'gcc:6.3.0',
        'C++ (g++ 5.4.0)': 'gcc:5.4.0',
        'C++ (g++ 4.9.4)': 'gcc:4.9.4',
        'C++ (g++ 4.8.5)': 'gcc:4.8.5',
        
        // Common Lisp
        'Common Lisp (SBCL 2.0.0)': 'clfoundation/sbcl:2.0.0',
        
        // D
        'D (DMD 2.089.1)': 'dlang:2.089.1',
        
        // Elixir
        'Elixir (1.9.4)': 'elixir:1.9.4',
        
        // Erlang
        'Erlang (OTP 22.2)': 'erlang:22.2',
        
        // Fortran
        'Fortran (GFortran 9.2.0)': 'gcc:9.2.0',
        
        // Go
        'Go (1.13.5)': 'golang:1.13.5',
        
        // Haskell
        'Haskell (GHC 8.8.1)': 'haskell:8.8.1',
        
        // Java
        'Java (OpenJDK 13.0.1)': 'openjdk:13.0.1',
        
        // JavaScript
        'JavaScript (Node.js 12.14.0)': 'node:12.14.0',
        
        // Lua
        'Lua (5.3.5)': 'lua:5.3.5',
        
        // OCaml
        'OCaml (4.09.0)': 'ocaml:4.09.0',
        
        // Octave
        'Octave (5.1.0)': 'gnuoctave/octave:5.1.0',
        
        // Pascal
        'Pascal (FPC 3.0.4)': 'freepascal:3.0.4',
        
        // PHP
        'PHP (7.4.1)': 'php:7.4.1',
        
        // Prolog
        'Prolog (GNU Prolog 1.4.5)': 'gprolog:1.4.5',
        
        // Python
        'Python (2.7.17)': 'python:2.7.17',
        'Python (3.8.1)': 'python:3.8.1',
        
        // Ruby
        'Ruby (2.7.0)': 'ruby:2.7.0',
        
        // Rust
        'Rust (1.40.0)': 'rust:1.40.0',
        
        // TypeScript
        'TypeScript (3.7.4)': 'node:12.14.0',
      };

      const image = imageMap[language?.name!];
      if (!image) {
        return null;
      }

      return {
        image,
        compileCmd: language.compile_cmd || undefined,
        runCmd: language.run_cmd,
        fileName: language.source_file,
        compileFirst: !!language.compile_cmd,
      };
    } catch (error) {
      console.error('Error fetching language config:', error);
      return null;
    }
  }
}