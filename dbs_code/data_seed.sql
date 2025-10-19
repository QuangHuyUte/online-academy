-- ========================================================
-- 01_base_data.sql
-- Người thực hiện:PHÚC
-- Nhiệm vụ: seed categories + users + instructors + email_otps
-- ========================================================


-- ---------- RESET DỮ LIỆU ----------
TRUNCATE TABLE email_otps, instructors, users, categories RESTART IDENTITY CASCADE;


-- ========================================================
-- 1. CATEGORIES (5 nhóm lớn + 5 lĩnh vực nhỏ mỗi nhóm)
-- ========================================================


-- Nhóm cha
INSERT INTO categories (name, slug) VALUES
  ('Information Technology', 'information-technology'),
  ('Business & Management', 'business-management'),
  ('Design & Creativity', 'design-creativity'),
  ('Marketing & Communication', 'marketing-communication'),
  ('Language & Culture', 'language-culture');


-- Nhóm con (5 lĩnh vực nhỏ mỗi nhóm)
INSERT INTO categories (parent_id, name, slug) VALUES
  ((SELECT id FROM categories WHERE slug='information-technology'), 'Web Development', 'web-development'),
  ((SELECT id FROM categories WHERE slug='information-technology'), 'Mobile Development', 'mobile-development'),
  ((SELECT id FROM categories WHERE slug='information-technology'), 'Cyber Security', 'cyber-security'),
  ((SELECT id FROM categories WHERE slug='information-technology'), 'Data Science', 'data-science'),
  ((SELECT id FROM categories WHERE slug='information-technology'), 'Cloud Computing', 'cloud-computing'),


  ((SELECT id FROM categories WHERE slug='business-management'), 'Finance & Accounting', 'finance-accounting'),
  ((SELECT id FROM categories WHERE slug='business-management'), 'Entrepreneurship', 'entrepreneurship'),
  ((SELECT id FROM categories WHERE slug='business-management'), 'Human Resources', 'human-resources'),
  ((SELECT id FROM categories WHERE slug='business-management'), 'Project Management', 'project-management'),
  ((SELECT id FROM categories WHERE slug='business-management'), 'E-commerce', 'e-commerce'),


  ((SELECT id FROM categories WHERE slug='design-creativity'), 'Graphic Design', 'graphic-design'),
  ((SELECT id FROM categories WHERE slug='design-creativity'), 'UI/UX Design', 'uiux-design'),
  ((SELECT id FROM categories WHERE slug='design-creativity'), '3D Modeling', '3d-modeling'),
  ((SELECT id FROM categories WHERE slug='design-creativity'), 'Photography', 'photography'),
  ((SELECT id FROM categories WHERE slug='design-creativity'), 'Animation', 'animation'),


  ((SELECT id FROM categories WHERE slug='marketing-communication'), 'Digital Marketing', 'digital-marketing'),
  ((SELECT id FROM categories WHERE slug='marketing-communication'), 'Brand Strategy', 'brand-strategy'),
  ((SELECT id FROM categories WHERE slug='marketing-communication'), 'SEO & Content Writing', 'seo-content-writing'),
  ((SELECT id FROM categories WHERE slug='marketing-communication'), 'Public Relations', 'public-relations'),
  ((SELECT id FROM categories WHERE slug='marketing-communication'), 'Social Media Marketing', 'social-media-marketing'),


  ((SELECT id FROM categories WHERE slug='language-culture'), 'English Language', 'english-language'),
  ((SELECT id FROM categories WHERE slug='language-culture'), 'Japanese Language', 'japanese-language'),
  ((SELECT id FROM categories WHERE slug='language-culture'), 'Korean Language', 'korean-language'),
  ((SELECT id FROM categories WHERE slug='language-culture'), 'Chinese Language', 'chinese-language'),
  ((SELECT id FROM categories WHERE slug='language-culture'), 'Translation & Interpretation', 'translation-interpretation');


-- ========================================================
-- 2. USERS (1 admin + 5 instructors + 8 students)
-- ========================================================


INSERT INTO users (name, email, password_hash, role) VALUES
  -- Admin
  ('Admin Master', 'admin@academy.com', '$2b$10$dummyhashadmin', 'admin'),


  -- Instructors
  ('Emma Johnson', 'emma@academy.com', '$2b$10$dummyhash', 'instructor'),
  ('David Nguyen', 'david@academy.com', '$2b$10$dummyhash', 'instructor'),
  ('Sophia Tran', 'sophia@academy.com', '$2b$10$dummyhash', 'instructor'),
  ('Michael Chen', 'michael@academy.com', '$2b$10$dummyhash', 'instructor'),
  ('Olivia Lee', 'olivia@academy.com', '$2b$10$dummyhash', 'instructor'),


  -- Students
  ('Tommy Pham', 'tommy@academy.com', '$2b$10$dummyhash', 'student'),
  ('Hannah Vu', 'hannah@academy.com', '$2b$10$dummyhash', 'student'),
  ('Kevin Do', 'kevin@academy.com', '$2b$10$dummyhash', 'student'),
  ('Lily Tran', 'lily@academy.com', '$2b$10$dummyhash', 'student'),
  ('Jason Le', 'jason@academy.com', '$2b$10$dummyhash', 'student'),
  ('Sarah Nguyen', 'sarah@academy.com', '$2b$10$dummyhash', 'student'),
  ('Ryan Phan', 'ryan@academy.com', '$2b$10$dummyhash', 'student'),
  ('Amy Vo', 'amy@academy.com', '$2b$10$dummyhash', 'student');


-- ========================================================
-- 3. INSTRUCTORS (liên kết với bảng users)
-- ========================================================


INSERT INTO instructors (user_id, bio, avatar_url) VALUES
  ((SELECT id FROM users WHERE email='emma@academy.com'), 'Senior Web Developer specialized in React and Node.js.', 'https://i.pravatar.cc/150?img=11'),
  ((SELECT id FROM users WHERE email='david@academy.com'), 'Cloud Architect and AWS Certified Solutions Engineer.', 'https://i.pravatar.cc/150?img=12'),
  ((SELECT id FROM users WHERE email='sophia@academy.com'), 'UI/UX Designer passionate about user-centered experiences.', 'https://i.pravatar.cc/150?img=13'),
  ((SELECT id FROM users WHERE email='michael@academy.com'), 'Digital Marketing expert and brand growth strategist.', 'https://i.pravatar.cc/150?img=14'),
  ((SELECT id FROM users WHERE email='olivia@academy.com'), 'Language instructor fluent in English, Japanese, and Korean.', 'https://i.pravatar.cc/150?img=15');


-- ========================================================
-- 4. EMAIL_OTPS (demo xác thực email)
-- ========================================================


INSERT INTO email_otps (email, otp, expires_at) VALUES
  ('tommy@academy.com', '321654', now() + interval '10 minutes'),
  ('hannah@academy.com', '987123', now() + interval '10 minutes'),
  ('kevin@academy.com', '456789', now() + interval '10 minutes'),
  ('lily@academy.com', '852369', now() + interval '10 minutes'),
  ('amy@academy.com', '753951', now() + interval '10 minutes');
