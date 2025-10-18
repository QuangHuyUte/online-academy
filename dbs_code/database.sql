-- =====================================================================
-- ONLINE ACADEMY - SCHEMA ONLY (Supabase/PostgreSQL)
-- =====================================================================

BEGIN;

-- ---------- ENUM: user_role ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('student','instructor','admin');
  END IF;
END$$;

-- ---------- CATEGORIES (2 cấp) ----------
CREATE TABLE IF NOT EXISTS categories (
  id            SERIAL PRIMARY KEY,
  parent_id     INT REFERENCES categories(id) ON DELETE SET NULL,
  name          VARCHAR(120) NOT NULL,
  slug          VARCHAR(160) UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role          user_role NOT NULL DEFAULT 'student',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ---------- INSTRUCTORS (hồ sơ giảng viên) ----------
CREATE TABLE IF NOT EXISTS instructors (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio           TEXT,
  avatar_url    TEXT,
  socials_json  JSONB DEFAULT '{}'::jsonb
);

-- ---------- COURSES ----------
CREATE TABLE IF NOT EXISTS courses (
  id              SERIAL PRIMARY KEY,
  cat_id          INT NOT NULL REFERENCES categories(id)   ON DELETE RESTRICT,
  instructor_id   INT NOT NULL REFERENCES instructors(id)  ON DELETE RESTRICT,
  title           VARCHAR(200) NOT NULL,
  short_desc      TEXT,
  long_desc_html  TEXT,
  cover_url       TEXT,
  price           NUMERIC(12,2),
  promo_price     NUMERIC(12,2),
  rating_avg      NUMERIC(3,2) DEFAULT 0,
  rating_count    INT          DEFAULT 0,
  students_count  INT          DEFAULT 0,
  is_completed    BOOLEAN      DEFAULT FALSE,
  is_removed      BOOLEAN      DEFAULT FALSE,
  last_updated_at TIMESTAMPTZ  DEFAULT now(),
  created_at      TIMESTAMPTZ  DEFAULT now(),
  fts             tsvector
);

-- ---------- SECTIONS (chương) ----------
CREATE TABLE IF NOT EXISTS sections (
  id         SERIAL PRIMARY KEY,
  course_id  INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  order_no   INT NOT NULL,
  UNIQUE(course_id, order_no)
);

-- ---------- LESSONS (bài/video) ----------
CREATE TABLE IF NOT EXISTS lessons (
  id           SERIAL PRIMARY KEY,
  section_id   INT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  video_url    TEXT NOT NULL,
  duration_sec INT,
  is_preview   BOOLEAN DEFAULT FALSE,
  order_no     INT NOT NULL,
  UNIQUE(section_id, order_no)
);

-- ---------- ENROLLMENTS (đăng ký/mua khóa) ----------
CREATE TABLE IF NOT EXISTS enrollments (
  user_id      INT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  course_id    INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, course_id)
);

-- ---------- PROGRESS (tiến độ theo bài) ----------
CREATE TABLE IF NOT EXISTS progress (
  user_id     INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  lesson_id   INT NOT NULL REFERENCES lessons(id)  ON DELETE CASCADE,
  watched_sec INT DEFAULT 0,
  is_done     BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, lesson_id)
);

-- ---------- REVIEWS (đánh giá) ----------
CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  course_id  INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- ---------- WATCHLIST (yêu thích) ----------
CREATE TABLE IF NOT EXISTS watchlist (
  user_id    INT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  course_id  INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, course_id)
);

-- ---------- EMAIL_OTPS (xác thực email) ----------
CREATE TABLE IF NOT EXISTS email_otps (
  email      VARCHAR(160) NOT NULL,
  otp        VARCHAR(6)   NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT now()
);

-- ---------- INDEXES ----------
CREATE INDEX IF NOT EXISTS idx_categories_parent   ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_courses_cat         ON courses(cat_id);
CREATE INDEX IF NOT EXISTS idx_courses_created     ON courses(created_at);
CREATE INDEX IF NOT EXISTS idx_courses_students    ON courses(students_count DESC);
CREATE INDEX IF NOT EXISTS idx_sections_course     ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section     ON lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_enroll_course       ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enroll_user         ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course      ON reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user      ON watchlist(user_id);

-- ---------- FULL-TEXT SEARCH (FTS) cho courses ----------
CREATE OR REPLACE FUNCTION courses_fts_update() RETURNS trigger AS $$
BEGIN
  NEW.fts :=
    to_tsvector('simple',
      coalesce(NEW.title,'') || ' ' ||
      coalesce(NEW.short_desc,'') || ' ' ||
      coalesce(NEW.long_desc_html,'')
    );
  RETURN NEW;
END$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_courses_fts ON courses;
CREATE TRIGGER trg_courses_fts
BEFORE INSERT OR UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION courses_fts_update();

CREATE INDEX IF NOT EXISTS idx_courses_fts ON courses USING GIN (fts);

COMMIT;

