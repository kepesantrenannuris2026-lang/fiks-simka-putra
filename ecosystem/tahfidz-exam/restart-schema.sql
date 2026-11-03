BEGIN;
ALTER TABLE tahfidz_exam.attempts DROP CONSTRAINT attempts_status_check;
ALTER TABLE tahfidz_exam.attempts ADD CONSTRAINT attempts_status_check CHECK(status IN('DRAFT','FINAL','BATAL'));
COMMIT;
