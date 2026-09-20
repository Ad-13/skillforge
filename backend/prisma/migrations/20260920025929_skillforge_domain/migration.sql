/*
  Warnings:

  - You are about to drop the `skills` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "skill_source" AS ENUM ('MANUAL', 'CAREEROS');

-- CreateEnum
CREATE TYPE "learning_language" AS ENUM ('EN', 'RU', 'DE');

-- CreateEnum
CREATE TYPE "node_relation" AS ENUM ('PREREQUISITE', 'CORE', 'ECOSYSTEM', 'RELATED');

-- CreateEnum
CREATE TYPE "content_origin" AS ENUM ('AI', 'USER');

-- CreateEnum
CREATE TYPE "resource_kind" AS ENUM ('LINK', 'NOTE');

-- CreateEnum
CREATE TYPE "resource_source_type" AS ENUM ('DOCS', 'ARTICLE', 'VIDEO', 'REPO', 'COURSE');

-- DropForeignKey
ALTER TABLE "skills" DROP CONSTRAINT "skills_user_id_fkey";

-- DropTable
DROP TABLE "skills";

-- DropEnum
DROP TYPE "skill_level";

-- CreateTable
CREATE TABLE "user_skills" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "source" "skill_source" NOT NULL DEFAULT 'MANUAL',
    "learning_language" "learning_language" NOT NULL DEFAULT 'EN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_maps" (
    "id" UUID NOT NULL,
    "user_skill_id" UUID NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT,

    CONSTRAINT "skill_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_map_nodes" (
    "id" UUID NOT NULL,
    "skill_map_id" UUID NOT NULL,
    "parent_id" UUID,
    "label" TEXT NOT NULL,
    "summary" TEXT,
    "relation" "node_relation",
    "origin" "content_origin" NOT NULL DEFAULT 'AI',
    "position" INTEGER NOT NULL DEFAULT 0,
    "linked_user_skill_id" UUID,

    CONSTRAINT "skill_map_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_roadmaps" (
    "id" UUID NOT NULL,
    "user_skill_id" UUID NOT NULL,
    "language" "learning_language" NOT NULL DEFAULT 'EN',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT,

    CONSTRAINT "learning_roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_stages" (
    "id" UUID NOT NULL,
    "roadmap_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT,

    CONSTRAINT "learning_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_steps" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "learning_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL,
    "user_skill_id" UUID NOT NULL,
    "step_id" UUID,
    "kind" "resource_kind" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "search_query" TEXT,
    "source_type" "resource_source_type",
    "content" TEXT,
    "language" "learning_language",
    "origin" "content_origin" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_skills_user_id_idx" ON "user_skills"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_user_id_slug_key" ON "user_skills"("user_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "skill_maps_user_skill_id_key" ON "skill_maps"("user_skill_id");

-- CreateIndex
CREATE INDEX "skill_map_nodes_skill_map_id_idx" ON "skill_map_nodes"("skill_map_id");

-- CreateIndex
CREATE INDEX "skill_map_nodes_parent_id_idx" ON "skill_map_nodes"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_roadmaps_user_skill_id_key" ON "learning_roadmaps"("user_skill_id");

-- CreateIndex
CREATE INDEX "learning_stages_roadmap_id_idx" ON "learning_stages"("roadmap_id");

-- CreateIndex
CREATE INDEX "learning_steps_stage_id_idx" ON "learning_steps"("stage_id");

-- CreateIndex
CREATE INDEX "resources_user_skill_id_idx" ON "resources"("user_skill_id");

-- CreateIndex
CREATE INDEX "resources_step_id_idx" ON "resources"("step_id");

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_maps" ADD CONSTRAINT "skill_maps_user_skill_id_fkey" FOREIGN KEY ("user_skill_id") REFERENCES "user_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_map_nodes" ADD CONSTRAINT "skill_map_nodes_skill_map_id_fkey" FOREIGN KEY ("skill_map_id") REFERENCES "skill_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_map_nodes" ADD CONSTRAINT "skill_map_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "skill_map_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_map_nodes" ADD CONSTRAINT "skill_map_nodes_linked_user_skill_id_fkey" FOREIGN KEY ("linked_user_skill_id") REFERENCES "user_skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_roadmaps" ADD CONSTRAINT "learning_roadmaps_user_skill_id_fkey" FOREIGN KEY ("user_skill_id") REFERENCES "user_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_stages" ADD CONSTRAINT "learning_stages_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "learning_roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_steps" ADD CONSTRAINT "learning_steps_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "learning_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_user_skill_id_fkey" FOREIGN KEY ("user_skill_id") REFERENCES "user_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "learning_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint: Prisma cannot express this, so it is added by hand.
-- A NOTE without content and a LINK with neither address nor search query are
-- both meaningless rows; nullable columns that are never legitimately null are
-- just missing constraints.
ALTER TABLE "resources" ADD CONSTRAINT "resources_kind_shape" CHECK (
  ("kind" = 'NOTE' AND "content" IS NOT NULL)
  OR ("kind" = 'LINK' AND "source_type" IS NOT NULL
      AND ("url" IS NOT NULL OR "search_query" IS NOT NULL))
);
