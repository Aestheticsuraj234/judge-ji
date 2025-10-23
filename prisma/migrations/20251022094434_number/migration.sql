/*
  Warnings:

  - The primary key for the `languages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `languages` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `language_id` on the `submissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."submissions" DROP CONSTRAINT "submissions_language_id_fkey";

-- AlterTable
ALTER TABLE "public"."languages" DROP CONSTRAINT "languages_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" INTEGER NOT NULL,
ADD CONSTRAINT "languages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."submissions" DROP COLUMN "language_id",
ADD COLUMN     "language_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
