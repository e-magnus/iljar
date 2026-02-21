ALTER TABLE "Service"
ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "durationMinutes" ASC, "name" ASC, "createdAt" ASC) - 1 AS position
  FROM "Service"
)
UPDATE "Service" AS s
SET "displayOrder" = ordered.position
FROM ordered
WHERE s."id" = ordered."id";

CREATE INDEX "Service_displayOrder_idx" ON "Service"("displayOrder");
