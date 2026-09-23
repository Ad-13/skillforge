DELETE FROM "skill_map_nodes";
DELETE FROM "skill_maps";

CREATE TYPE "map_lens" AS ENUM ('FOUNDATION', 'ANATOMY', 'ECOSYSTEM');

DROP INDEX IF EXISTS "skill_maps_user_skill_id_key";

ALTER TABLE "skill_maps"
  ADD COLUMN "lens" "map_lens" NOT NULL;

CREATE UNIQUE INDEX "skill_maps_user_skill_id_lens_key"
  ON "skill_maps"("user_skill_id", "lens");

ALTER TABLE "skill_map_nodes"
  ADD COLUMN "slug" TEXT NOT NULL,
  ADD COLUMN "ancestor_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "expanded_at" TIMESTAMP(3);

CREATE INDEX "skill_map_nodes_skill_map_id_slug_idx"
  ON "skill_map_nodes"("skill_map_id", "slug");
