-- Add client overview header visibility settings
ALTER TABLE "Settings"
ADD COLUMN "clientOverviewVisibility" JSONB NOT NULL DEFAULT '{"showKennitala":true,"showPhone":true,"showFlags":true}';
