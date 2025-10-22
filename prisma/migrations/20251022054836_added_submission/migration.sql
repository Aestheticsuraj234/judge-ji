/*
  Warnings:

  - You are about to drop the `Test` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."Test";

-- CreateTable
CREATE TABLE "public"."submissions" (
    "id" TEXT NOT NULL,
    "token" TEXT,
    "source_code" JSONB,
    "language_id" TEXT NOT NULL,
    "compiler_options" JSONB,
    "command_line_arguments" TEXT,
    "stdin" TEXT,
    "expected_output" TEXT,
    "additional_files" BYTEA,
    "callback_url" TEXT,
    "stdout" TEXT,
    "stderr" TEXT,
    "compile_output" TEXT,
    "message" TEXT,
    "exit_code" INTEGER,
    "exit_signal" INTEGER,
    "status_id" INTEGER,
    "time" DOUBLE PRECISION,
    "wall_time" DOUBLE PRECISION,
    "memory" INTEGER,
    "created_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "queued_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "queue_host" TEXT,
    "execution_host" TEXT,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."languages" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "compile_cmd" TEXT,
    "run_cmd" TEXT,
    "source_file" TEXT,
    "is_archived" BOOLEAN NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."statuses" (
    "id" SERIAL NOT NULL,
    "name" TEXT,

    CONSTRAINT "statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "submissions_token_key" ON "public"."submissions"("token");

-- CreateIndex
CREATE INDEX "submissions_token_idx" ON "public"."submissions"("token");

-- AddForeignKey
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
