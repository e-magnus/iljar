-- AlterTable
ALTER TABLE "Settings"
ALTER COLUMN "customClinicalFlags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Settings"
ALTER COLUMN "customClinicalFlags" TYPE JSONB
USING to_jsonb("customClinicalFlags");

-- Transform existing text[] values into structured objects
UPDATE "Settings"
SET "customClinicalFlags" = COALESCE(
  (
    SELECT jsonb_agg(jsonb_build_object('label', value, 'icon', 'ℹ️'))
    FROM jsonb_array_elements_text("customClinicalFlags") AS value
  ),
  '[]'::jsonb
);

-- AlterTable
ALTER TABLE "Settings"
ALTER COLUMN "customClinicalFlags" SET DEFAULT '[]'::jsonb;
