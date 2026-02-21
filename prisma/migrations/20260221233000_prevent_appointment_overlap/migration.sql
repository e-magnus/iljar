CREATE OR REPLACE FUNCTION "prevent_appointment_overlap"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."startTime" >= NEW."endTime" THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;

  IF NEW."status" = 'CANCELLED'::"AppointmentStatus" THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Appointment" existing
    WHERE existing."id" <> COALESCE(NEW."id", '')
      AND existing."status" <> 'CANCELLED'::"AppointmentStatus"
      AND existing."startTime" < NEW."endTime"
      AND existing."endTime" > NEW."startTime"
  ) THEN
    RAISE EXCEPTION 'Time slot is already booked'
      USING ERRCODE = '23P01', CONSTRAINT = 'appointment_no_overlap_active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "appointment_no_overlap_active_trigger" ON "Appointment";

CREATE TRIGGER "appointment_no_overlap_active_trigger"
BEFORE INSERT OR UPDATE OF "startTime", "endTime", "status"
ON "Appointment"
FOR EACH ROW
EXECUTE FUNCTION "prevent_appointment_overlap"();
