-- =====================================================================
-- ONLINE ACADEMY - FULL RESET & CREATE (Supabase/PostgreSQL)
-- - Giữ nguyên tối ưu hoá & ràng buộc của bản bạn gửi
-- - Bổ sung view_count vào courses + index
-- - Dọn sạch schema cũ an toàn
-- =====================================================================

BEGIN;

-- ---------- SAFETY ----------
SET client_min_messages = WARNING;
SET search_path = public;

-- ---------- DROP OBJECTS (theo đúng thứ tự phụ thuộc) ----------
-- Bỏ trigger tùy biến nếu có (tránh lỗi khi DROP function/table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'trg_courses_updated_at'
      AND c.relname = 'courses'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;';
  END IF;
END$$;

-- Không còn function FTS thủ công (vì dùng GENERATED), chỉ còn function updated_at
DROP FUNCTION IF EXISTS set_courses_updated_at() CASCADE;

-- Bảng (theo quan hệ FK)
DROP TABLE IF EXISTS email_otps        CASCADE;
DROP TABLE IF EXISTS watchlist         CASCADE;
DROP TABLE IF EXISTS reviews           CASCADE;
DROP TABLE IF EXISTS progress          CASCADE;
DROP TABLE IF EXISTS enrollments       CASCADE;
DROP TABLE IF EXISTS lessons           CASCADE;
DROP TABLE IF EXISTS sections          CASCADE;
DROP TABLE IF EXISTS courses           CASCADE;
DROP TABLE IF EXISTS instructors       CASCADE;
DROP TABLE IF EXISTS users             CASCADE;
DROP TABLE IF EXISTS categories        CASCADE;

-- Enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    DROP TYPE user_role;
  END IF;
END$$;

-- =====================================================================
-- RE-CREATE
-- =====================================================================

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
  slug          VARCHAR(160) NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Tránh trùng tên trong cùng 1 nhóm cha
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_parent_name
  ON categories(parent_id, name);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role          user_role NOT NULL DEFAULT 'student',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Email unique theo lower() (tránh trùng hoa/thường)
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON users (lower(email));

-- ---------- INSTRUCTORS ----------
CREATE TABLE IF NOT EXISTS instructors (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio           TEXT,
  avatar_url    TEXT,
  socials_json  JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT uq_instructors_user UNIQUE (user_id)
);

-- ---------- COURSES (đÃ BỔ SUNG view_count) ----------
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
  view_count      INT          NOT NULL DEFAULT 0,  -- NEW: lượt xem trang khoá học
  is_completed    BOOLEAN      DEFAULT FALSE,
  is_removed      BOOLEAN      DEFAULT FALSE,
  last_updated_at TIMESTAMPTZ  DEFAULT now(),
  created_at      TIMESTAMPTZ  DEFAULT now(),
  -- FTS sẽ thêm ở dưới bằng GENERATED (an toàn hơn)
  fts             tsvector
);

-- Giá trị hợp lệ
ALTER TABLE courses
  ADD CONSTRAINT ck_courses_price_pos CHECK (price IS NULL OR price >= 0),
  ADD CONSTRAINT ck_courses_promo_pos CHECK (promo_price IS NULL OR promo_price >= 0),
  ADD CONSTRAINT ck_courses_promo_le_price CHECK (
    promo_price IS NULL OR price IS NULL OR promo_price <= price
  );

-- Trigger tự cập nhật last_updated_at
CREATE OR REPLACE FUNCTION set_courses_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.last_updated_at := now();
  RETURN NEW;
END$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION set_courses_updated_at();

CREATE INDEX IF NOT EXISTS idx_courses_cat       ON courses(cat_id);
CREATE INDEX IF NOT EXISTS idx_courses_created   ON courses(created_at);
CREATE INDEX IF NOT EXISTS idx_courses_students  ON courses(students_count DESC);
CREATE INDEX IF NOT EXISTS idx_courses_views     ON courses(view_count DESC);  -- NEW

-- ---------- SECTIONS ----------
CREATE TABLE IF NOT EXISTS sections (
  id         SERIAL PRIMARY KEY,
  course_id  INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  order_no   INT NOT NULL CHECK (order_no > 0),
  UNIQUE(course_id, order_no)
);

CREATE INDEX IF NOT EXISTS idx_sections_course ON sections(course_id);

-- ---------- LESSONS ----------
CREATE TABLE IF NOT EXISTS lessons (
  id           SERIAL PRIMARY KEY,
  section_id   INT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  video_url    TEXT NOT NULL,
  duration_sec INT CHECK (duration_sec IS NULL OR duration_sec >= 0),
  is_preview   BOOLEAN DEFAULT FALSE,
  order_no     INT NOT NULL CHECK (order_no > 0),
  UNIQUE(section_id, order_no)
);

CREATE INDEX IF NOT EXISTS idx_lessons_section ON lessons(section_id);

-- ---------- ENROLLMENTS ----------
CREATE TABLE IF NOT EXISTS enrollments (
  user_id      INT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  course_id    INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enroll_user   ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enroll_course ON enrollments(course_id);

-- ---------- PROGRESS ----------
CREATE TABLE IF NOT EXISTS progress (
  user_id     INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  lesson_id   INT NOT NULL REFERENCES lessons(id)  ON DELETE CASCADE,
  watched_sec INT DEFAULT 0,
  is_done     BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, lesson_id)
);

-- ---------- REVIEWS ----------
CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  course_id  INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id);

-- ---------- WATCHLIST ----------
CREATE TABLE IF NOT EXISTS watchlist (
  user_id    INT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  course_id  INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);

-- ---------- EMAIL_OTPS ----------
CREATE TABLE IF NOT EXISTS email_otps (
  id          BIGSERIAL PRIMARY KEY,
  email       VARCHAR(160) NOT NULL,
  otp         VARCHAR(6)   NOT NULL CHECK (otp ~ '^[0-9]{6}$'),
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email      ON email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON email_otps(expires_at);

-- ---------- FULL-TEXT SEARCH (FTS) ----------
-- Dùng GENERATED ALWAYS để đồng bộ FTS tự động, không cần trigger
ALTER TABLE courses DROP COLUMN IF EXISTS fts;

ALTER TABLE courses
  ADD COLUMN fts tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title,'') || ' ' ||
      coalesce(short_desc,'') || ' ' ||
      coalesce(long_desc_html,'')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_courses_fts ON courses USING GIN (fts);

COMMIT;
