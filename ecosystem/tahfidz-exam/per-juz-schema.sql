-- Expand the question identifier capacity only; no rows are removed or rewritten.
BEGIN;
ALTER TABLE tahfidz_exam.questions DROP CONSTRAINT questions_n_check;
ALTER TABLE tahfidz_exam.questions ADD CONSTRAINT questions_n_check CHECK(n BETWEEN 1 AND 150) NOT VALID;
ALTER TABLE tahfidz_exam.questions VALIDATE CONSTRAINT questions_n_check;
COMMIT;
