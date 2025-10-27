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

-- ========================================================




-- 5. COURSE

-- 02_courses.sql
-- Người thực hiện: Cường
-- Nhiệm vụ: Tạo khóa học (gắn category + instructor)
-- ========================================================

TRUNCATE TABLE courses RESTART IDENTITY CASCADE;

-- ========================================================
-- 1. COURSES (12 khóa học đa dạng lĩnh vực)
-- ========================================================

INSERT INTO courses (cat_id, instructor_id, title, short_desc, long_desc_html, cover_url, price, promo_price)
VALUES
-- Emma Johnson - Web Development
((SELECT id FROM categories WHERE slug='web-development'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='emma@academy.com')),
 'Modern Web Development with React',
 'Learn to build modern and scalable web apps using React and Node.js.',
 '<p>This course introduces modern React development using functional components, hooks, and API integration.</p>',
 'https://plus.unsplash.com/premium_photo-1685086785054-d047cdc0e525?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8d2ViJTIwZGV2ZWxvcG1lbnR8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=900',
 49.99, 29.99),

((SELECT id FROM categories WHERE slug='mobile-development'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='emma@academy.com')),
 'Flutter for Beginners',
 'Create cross-platform mobile apps with Google Flutter and Dart.',
 '<p>Hands-on introduction to Flutter widgets, layouts, and state management for iOS and Android.</p>',
 'https://plus.unsplash.com/premium_photo-1683936163005-a506303344b3?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bW9iaWxlJTIwZGV2ZWxvcG1lbnR8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=900',
 39.99, 24.99),

-- David Nguyen - Cloud Computing / Cyber Security 
((SELECT id FROM categories WHERE slug='cloud-computing'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='david@academy.com')),
 'AWS Cloud Fundamentals',
 'Master AWS basics: EC2, S3, and serverless architecture.',
 '<p>Comprehensive introduction to AWS services, IAM, networking, and cloud deployment.</p>',
 'https://plus.unsplash.com/premium_photo-1683120968693-9af51578770e?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y2xvdWQlMjBjb21wdXRpbmd8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=1600',
 59.99, 39.99),

((SELECT id FROM categories WHERE slug='cyber-security'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='david@academy.com')),
 'Introduction to Cybersecurity',
 'Learn essential cybersecurity principles and protection methods.',
 '<p>Understand firewalls, encryption, malware, and defensive strategies to protect digital systems.</p>',
 'https://images.unsplash.com/photo-1614064548237-096f735f344f?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y3liZXIlMjBzZWN1cml0eXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=1600',
 54.99, 32.99),

-- Sophia Tran - Design & UI/UX
((SELECT id FROM categories WHERE slug='uiux-design'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='sophia@academy.com')),
 'UI/UX Design for Beginners',
 'Learn to create user-friendly and visually appealing interfaces.',
 '<p>This course covers Figma, prototyping, and usability testing for modern product design.</p>',
 'https://plus.unsplash.com/premium_photo-1733306548826-95daff988ae6?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8dWklMkZ1eCUyMGRlc2lnbnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=1600',
 45.99, 27.99),

((SELECT id FROM categories WHERE slug='graphic-design'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='sophia@academy.com')),
 'Adobe Photoshop Masterclass',
 'Master Photoshop tools and techniques for digital design.',
 '<p>Learn image editing, color correction, and compositing to create stunning visuals.</p>',
 'https://images.unsplash.com/photo-1626785774573-4b799315345d?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Z3JhcGhpYyUyMGRlc2lnbnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=1600',
 49.99, 29.99),

-- Michael Chen - Marketing
((SELECT id FROM categories WHERE slug='digital-marketing'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='michael@academy.com')),
 'Digital Marketing 101',
 'Discover the fundamentals of online marketing, SEO, and analytics.',
 '<p>Learn Google Ads, Facebook Ads, and content marketing strategies for real-world success.</p>',
 'https://images.unsplash.com/photo-1557838923-2985c318be48?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZGlnaXRhbCUyMG1hcmtldGluZ3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=1600',
 59.99, 34.99),

((SELECT id FROM categories WHERE slug='social-media-marketing'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='michael@academy.com')),
 'Social Media Marketing Strategy',
 'Build a strong brand presence on social media platforms.',
 '<p>Understand audience targeting, engagement metrics, and content creation for growth.</p>',
 'https://images.unsplash.com/photo-1683721003111-070bcc053d8b?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8c29jaWFsJTIwbWVkaWF8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=1600',
 44.99, 26.99),

-- Olivia Lee - Language
((SELECT id FROM categories WHERE slug='english-language'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='olivia@academy.com')),
 'English Communication for Beginners',
 'Improve your English speaking and writing skills with interactive lessons.',
 '<p>This course focuses on real-life communication, pronunciation, and vocabulary building.</p>',
 'https://plus.unsplash.com/premium_photo-1682088176629-0f48d58a614c?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8ZW5nbGlzaCUyMGxlc3NvbnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=1600',
 29.99, 19.99),

((SELECT id FROM categories WHERE slug='japanese-language'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='olivia@academy.com')),
 'Japanese Language N5 Preparation',
 'Start your journey with basic Japanese grammar, vocabulary, and kanji.',
 '<p>Designed for JLPT N5 preparation with speaking and writing practice.</p>',
 'https://images.unsplash.com/photo-1589123053298-eab8ed8e29e9?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8amFwYW5lc2UlMjBsZXNzb258ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=1600',
 39.99, 25.99),

((SELECT id FROM categories WHERE slug='korean-language'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='olivia@academy.com')),
 'Korean for Everyday Conversation',
 'Learn to speak Korean confidently in daily situations.',
 '<p>Practice pronunciation, grammar, and cultural expressions used in modern Korea.</p>',
 'https://plus.unsplash.com/premium_photo-1723629680032-d24ef1c9f026?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8a29yZWFuJTIwbGVzc29ufGVufDB8fDB8fHww&auto=format&fit=crop&q=60&w=1600',
 34.99, 22.99),

((SELECT id FROM categories WHERE slug='translation-interpretation'),
 (SELECT id FROM instructors WHERE user_id = (SELECT id FROM users WHERE email='olivia@academy.com')),
 'Translation and Interpretation Basics',
 'Develop essential translation techniques for English–Vietnamese pairs.',
 '<p>Learn sentence structure, idiomatic expressions, and cultural adaptation in translation.</p>',
 'https://images.unsplash.com/photo-1634128221889-82ed6efebfc3?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8TGFuZ3VhZ2V8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=1600',
 42.99, 28.99);

-- ========================================================
-- 03_content.sql (đã FIX lỗi subquery nhiều dòng)
-- Người thực hiện: Cường
-- Nhiệm vụ: Tạo nội dung khóa học (sections + lessons)
-- ========================================================

TRUNCATE TABLE lessons, sections RESTART IDENTITY CASCADE;

-- ========================================================
-- 1. SECTIONS
-- ========================================================

INSERT INTO sections (course_id, title, order_no)
VALUES
-- React Course
((SELECT id FROM courses WHERE title='Modern Web Development with React'), 'Introduction to React', 1),
((SELECT id FROM courses WHERE title='Modern Web Development with React'), 'Working with Components', 2),
((SELECT id FROM courses WHERE title='Modern Web Development with React'), 'Hooks & State Management', 3),

-- Flutter Course
((SELECT id FROM courses WHERE title='Flutter for Beginners'), 'Getting Started with Flutter', 1),
((SELECT id FROM courses WHERE title='Flutter for Beginners'), 'Layouts and Widgets', 2),
((SELECT id FROM courses WHERE title='Flutter for Beginners'), 'Navigation and State', 3),

-- AWS Cloud
((SELECT id FROM courses WHERE title='AWS Cloud Fundamentals'), 'Cloud Basics', 1),
((SELECT id FROM courses WHERE title='AWS Cloud Fundamentals'), 'AWS Core Services', 2),
((SELECT id FROM courses WHERE title='AWS Cloud Fundamentals'), 'Deploying Applications', 3),

-- Cybersecurity
((SELECT id FROM courses WHERE title='Introduction to Cybersecurity'), 'Cybersecurity Overview', 1),
((SELECT id FROM courses WHERE title='Introduction to Cybersecurity'), 'Network Security', 2),
((SELECT id FROM courses WHERE title='Introduction to Cybersecurity'), 'Security Practices', 3),

-- UI/UX Design
((SELECT id FROM courses WHERE title='UI/UX Design for Beginners'), 'UI/UX Fundamentals', 1),
((SELECT id FROM courses WHERE title='UI/UX Design for Beginners'), 'Wireframes and Prototypes', 2),
((SELECT id FROM courses WHERE title='UI/UX Design for Beginners'), 'Usability Testing', 3),

-- Photoshop
((SELECT id FROM courses WHERE title='Adobe Photoshop Masterclass'), 'Introduction to Photoshop', 1),
((SELECT id FROM courses WHERE title='Adobe Photoshop Masterclass'), 'Layers and Tools', 2),
((SELECT id FROM courses WHERE title='Adobe Photoshop Masterclass'), 'Advanced Editing', 3),

-- Digital Marketing
((SELECT id FROM courses WHERE title='Digital Marketing 101'), 'Marketing Basics', 1),
((SELECT id FROM courses WHERE title='Digital Marketing 101'), 'SEO and Analytics', 2),
((SELECT id FROM courses WHERE title='Digital Marketing 101'), 'Campaign Management', 3),

-- Social Media
((SELECT id FROM courses WHERE title='Social Media Marketing Strategy'), 'Social Media Platforms', 1),
((SELECT id FROM courses WHERE title='Social Media Marketing Strategy'), 'Content Strategy', 2),
((SELECT id FROM courses WHERE title='Social Media Marketing Strategy'), 'Analytics and Engagement', 3),

-- English
((SELECT id FROM courses WHERE title='English Communication for Beginners'), 'Basic Grammar', 1),
((SELECT id FROM courses WHERE title='English Communication for Beginners'), 'Speaking Practice', 2),
((SELECT id FROM courses WHERE title='English Communication for Beginners'), 'Listening and Writing', 3),

-- Japanese
((SELECT id FROM courses WHERE title='Japanese Language N5 Preparation'), 'Hiragana & Katakana', 1),
((SELECT id FROM courses WHERE title='Japanese Language N5 Preparation'), 'Basic Grammar & Vocabulary', 2),
((SELECT id FROM courses WHERE title='Japanese Language N5 Preparation'), 'JLPT Practice Tests', 3),

-- Korean
((SELECT id FROM courses WHERE title='Korean for Everyday Conversation'), 'Hangul Basics', 1),
((SELECT id FROM courses WHERE title='Korean for Everyday Conversation'), 'Common Phrases', 2),
((SELECT id FROM courses WHERE title='Korean for Everyday Conversation'), 'Speaking Practice', 3),

-- Translation
((SELECT id FROM courses WHERE title='Translation and Interpretation Basics'), 'Translation Fundamentals', 1),
((SELECT id FROM courses WHERE title='Translation and Interpretation Basics'), 'Cultural Adaptation', 2),
((SELECT id FROM courses WHERE title='Translation and Interpretation Basics'), 'Interpretation Practice', 3);

-- ========================================================
-- 2. LESSONS (đã FIX subquery nhiều dòng)
-- ========================================================

INSERT INTO lessons (section_id, title, video_url, duration_sec, is_preview, order_no)
VALUES
-- React
((SELECT id FROM sections WHERE title='Introduction to React' 
  AND course_id=(SELECT id FROM courses WHERE title='Modern Web Development with React')),
 'What is React?', 'https://www.youtube.com/watch?v=Tn6-PIqc4UM&t=70s', 420, TRUE, 1),
((SELECT id FROM sections WHERE title='Working with Components' 
  AND course_id=(SELECT id FROM courses WHERE title='Modern Web Development with React')),
 'Props and State', 'https://www.youtube.com/watch?v=mECV6nGOqNo', 480, FALSE, 1),
((SELECT id FROM sections WHERE title='Hooks & State Management' 
  AND course_id=(SELECT id FROM courses WHERE title='Modern Web Development with React')),
 'Using useState and useEffect', 'https://www.youtube.com/watch?v=kt0FrkQgw8w&list=PL6QREj8te1P7q1OjvnnLG-Tm7OX5u4Mg9', 530, FALSE, 1),

-- Flutter
((SELECT id FROM sections WHERE title='Getting Started with Flutter' 
  AND course_id=(SELECT id FROM courses WHERE title='Flutter for Beginners')),
 'Installing Flutter', 'https://www.youtube.com/watch?v=p1l-BUtjHJk&list=PLyxSzL3F7484qhNw1K08o8kDn8ecCpA_j', 400, TRUE, 1),
((SELECT id FROM sections WHERE title='Layouts and Widgets' 
  AND course_id=(SELECT id FROM courses WHERE title='Flutter for Beginners')),
 'Container and Row', 'https://www.youtube.com/watch?v=OrG794LT0c4', 420, FALSE, 1),
((SELECT id FROM sections WHERE title='Navigation and State' 
  AND course_id=(SELECT id FROM courses WHERE title='Flutter for Beginners')),
 'Navigator 2.0 Overview', 'https://www.youtube.com/watch?v=1xipg02Wu8s', 460, FALSE, 1),

-- AWS
((SELECT id FROM sections WHERE title='Cloud Basics' 
  AND course_id=(SELECT id FROM courses WHERE title='AWS Cloud Fundamentals')),
 'What is Cloud Computing?', 'https://www.youtube.com/watch?v=ZaA0kNm18pE', 390, TRUE, 1),
((SELECT id FROM sections WHERE title='AWS Core Services' 
  AND course_id=(SELECT id FROM courses WHERE title='AWS Cloud Fundamentals')),
 'Amazon EC2 and S3', 'https://www.youtube.com/watch?v=JIbIYCM48to', 470, FALSE, 1),
((SELECT id FROM sections WHERE title='Deploying Applications' 
  AND course_id=(SELECT id FROM courses WHERE title='AWS Cloud Fundamentals')),
 'Deploying on AWS Lambda', 'https://www.youtube.com/watch?v=cw34KMPSt4k', 530, FALSE, 1),

-- Cybersecurity
((SELECT id FROM sections WHERE title='Cybersecurity Overview' 
  AND course_id=(SELECT id FROM courses WHERE title='Introduction to Cybersecurity')),
 'Understanding Threats', 'https://www.youtube.com/watch?v=zYLkdT731x8', 380, TRUE, 1),
((SELECT id FROM sections WHERE title='Network Security' 
  AND course_id=(SELECT id FROM courses WHERE title='Introduction to Cybersecurity')),
 'Firewalls and VPNs', 'https://www.youtube.com/watch?v=NIRXtMg-0z8', 440, FALSE, 1),
((SELECT id FROM sections WHERE title='Security Practices' 
  AND course_id=(SELECT id FROM courses WHERE title='Introduction to Cybersecurity')),
 'Best Practices', 'https://www.youtube.com/watch?v=kNQp1Tda_TQ&list=PLT8yTjyUGL2xwaWl2ermpNzuQxzoeX6zD', 460, FALSE, 1),

-- UI/UX
((SELECT id FROM sections WHERE title='UI/UX Fundamentals' 
  AND course_id=(SELECT id FROM courses WHERE title='UI/UX Design for Beginners')),
 'Design Thinking Basics', 'https://www.youtube.com/watch?v=wIuVvCuiJhU', 450, TRUE, 1),
((SELECT id FROM sections WHERE title='Wireframes and Prototypes' 
  AND course_id=(SELECT id FROM courses WHERE title='UI/UX Design for Beginners')),
 'Using Figma', 'https://www.youtube.com/watch?v=iyrEStiTZh0', 510, FALSE, 1),
((SELECT id FROM sections WHERE title='Usability Testing' 
  AND course_id=(SELECT id FROM courses WHERE title='UI/UX Design for Beginners')),
 'Testing Techniques', 'https://www.youtube.com/watch?v=jWEE3YYv9BU', 420, FALSE, 1),

-- Photoshop
((SELECT id FROM sections WHERE title='Introduction to Photoshop' 
  AND course_id=(SELECT id FROM courses WHERE title='Adobe Photoshop Masterclass')),
 'Interface Overview', 'https://www.youtube.com/watch?v=qwNbjGyhZ48', 400, TRUE, 1),
((SELECT id FROM sections WHERE title='Layers and Tools' 
  AND course_id=(SELECT id FROM courses WHERE title='Adobe Photoshop Masterclass')),
 'Using Layers', 'https://www.youtube.com/watch?v=WP8eswvWZeo&list=PLCT625VX33gT3NiV1nSx1MDie6suwtMg6', 460, FALSE, 1),
((SELECT id FROM sections WHERE title='Advanced Editing' 
  AND course_id=(SELECT id FROM courses WHERE title='Adobe Photoshop Masterclass')),
 'Color Correction', 'https://www.youtube.com/watch?v=owStZxm9DIA', 480, FALSE, 1),

-- Digital Marketing
((SELECT id FROM sections WHERE title='Marketing Basics' 
  AND course_id=(SELECT id FROM courses WHERE title='Digital Marketing 101')),
 'Marketing Funnel', 'https://www.youtube.com/watch?v=0mczz27i19w&pp=ygUgbWFya2V0IGJhc2ljIGVkaXQgcGhvdG8gdHV0b3JpYWw%3D', 430, TRUE, 1),
((SELECT id FROM sections WHERE title='SEO and Analytics' 
  AND course_id=(SELECT id FROM courses WHERE title='Digital Marketing 101')),
 'Google Analytics 101', 'https://www.youtube.com/watch?v=MYE6T_gd7H0&pp=ygUNc2VvIGFuYWx5dGljcw%3D%3D', 520, FALSE, 1),
((SELECT id FROM sections WHERE title='Campaign Management' 
  AND course_id=(SELECT id FROM courses WHERE title='Digital Marketing 101')),
 'Running Facebook Ads', 'https://www.youtube.com/watch?v=W6SkSK46HA4&pp=ygUTY2FtcGFpZ24gbWFuYWdlbWVudA%3D%3D', 540, FALSE, 1),

-- Social Media
((SELECT id FROM sections WHERE title='Social Media Platforms' 
  AND course_id=(SELECT id FROM courses WHERE title='Social Media Marketing Strategy')),
 'Overview of Major Platforms', 'https://www.youtube.com/watch?v=6-15znNFQK8&pp=ygUVc29jaWFsIG1lZGlhIHBsYXRmb3Jt', 400, TRUE, 1),
((SELECT id FROM sections WHERE title='Content Strategy' 
  AND course_id=(SELECT id FROM courses WHERE title='Social Media Marketing Strategy')),
 'Planning Engaging Content', 'https://www.youtube.com/watch?v=H9DXLvR-Yb8&pp=ygUQY29udGVudCBzdHJhdGVneQ%3D%3D', 480, FALSE, 1),
((SELECT id FROM sections WHERE title='Analytics and Engagement' 
  AND course_id=(SELECT id FROM courses WHERE title='Social Media Marketing Strategy')),
 'Tracking KPIs', 'https://www.youtube.com/watch?v=bilOOPuAvTY&pp=ygUSbWFya2V0aW5nIHN0cmF0ZWd5', 510, FALSE, 1),

-- English
((SELECT id FROM sections WHERE title='Basic Grammar' 
  AND course_id=(SELECT id FROM courses WHERE title='English Communication for Beginners')),
 'Tenses Overview', 'https://www.youtube.com/watch?v=6LFjVC3cHjI&pp=ygUVYmFzaWMgZ3JhbW1hciBlbmdsaXNo', 420, TRUE, 1),
((SELECT id FROM sections WHERE title='Speaking Practice' 
  AND course_id=(SELECT id FROM courses WHERE title='English Communication for Beginners')),
 'Common Conversations', 'https://www.youtube.com/watch?v=FfhZFRvmaVY&pp=ygURc3BlYWtpbmcgcHJhY3RpY2U%3D', 500, FALSE, 1),
((SELECT id FROM sections WHERE title='Listening and Writing' 
  AND course_id=(SELECT id FROM courses WHERE title='English Communication for Beginners')),
 'Listening Tips', 'https://www.youtube.com/watch?v=rrjWWZud-B8&pp=ygUUbGlzdGVuaW5nIGFuZCByaXRpbmc%3D', 490, FALSE, 1),

-- Japanese
((SELECT id FROM sections WHERE title='Hiragana & Katakana' 
  AND course_id=(SELECT id FROM courses WHERE title='Japanese Language N5 Preparation')),
 'Learn Hiragana', 'https://www.youtube.com/watch?v=2qk4gCZuSjk&pp=ygUISGlnYXJhbmHSBwkJ_AkBhyohjO8%3D', 410, TRUE, 1),
((SELECT id FROM sections WHERE title='Basic Grammar & Vocabulary' 
  AND course_id=(SELECT id FROM courses WHERE title='Japanese Language N5 Preparation')),
 'Common Sentences', 'https://www.youtube.com/watch?v=-h8xnu1Okdg&list=PLMP8b3W1auVlpjrV1otr1x-DP0kWlT7yk', 460, FALSE, 1),
((SELECT id FROM sections WHERE title='JLPT Practice Tests' 
  AND course_id=(SELECT id FROM courses WHERE title='Japanese Language N5 Preparation')),
 'Sample Test 1', 'https://www.youtube.com/watch?v=HOCgOTbCzFI', 480, FALSE, 1),

-- Korean
((SELECT id FROM sections WHERE title='Hangul Basics' 
  AND course_id=(SELECT id FROM courses WHERE title='Korean for Everyday Conversation')),
 'Korean Alphabet', 'https://www.youtube.com/watch?v=0ZhOeA0RD9o&pp=ygUMaGFuZ3VsIGJhc2lj', 420, TRUE, 1),
((SELECT id FROM sections WHERE title='Common Phrases' 
  AND course_id=(SELECT id FROM courses WHERE title='Korean for Everyday Conversation')),
 'Daily Expressions', 'https://www.youtube.com/watch?v=iOH4f7r2WUQ&pp=ygUbaGFuZ3VsIGJhc2ljIGNvbW1vbiBwaHJhc2Vz', 460, FALSE, 1),
((SELECT id FROM sections WHERE title='Speaking Practice' 
  AND course_id=(SELECT id FROM courses WHERE title='Korean for Everyday Conversation')),
 'Conversation Practice', 'https://www.youtube.com/watch?v=RsZjfHmPaLo&pp=ygUbaGFuZ3VsIGJhc2ljIGNvbW1vbiBwaHJhc2Vz', 500, FALSE, 1),

-- Translation
((SELECT id FROM sections WHERE title='Translation Fundamentals' 
  AND course_id=(SELECT id FROM courses WHERE title='Translation and Interpretation Basics')),
 'What is Translation?', 'https://www.youtube.com/watch?v=J2F4I1-j6cg&pp=ygUYdHJhbnNsYXRpb24gZnVuZGFsbWVudGFs', 420, TRUE, 1),
((SELECT id FROM sections WHERE title='Cultural Adaptation' 
  AND course_id=(SELECT id FROM courses WHERE title='Translation and Interpretation Basics')),
 'Understanding Context', 'https://www.youtube.com/watch?v=twCpijr_GeQ&pp=ygUndHJhbnNsYXRpb24gaW50ZXJwcmV0YXRpb24gZnVuZGFsbWVudGFs', 480, FALSE, 1),
((SELECT id FROM sections WHERE title='Interpretation Practice' 
  AND course_id=(SELECT id FROM courses WHERE title='Translation and Interpretation Basics')),
 'Simultaneous Interpretation', 'https://www.youtube.com/watch?v=20Shv0XTQfg&pp=ygUXaW50ZXJwcmV0YXRpb24gcHJhY3RpY2U%3D', 500, FALSE, 1);

-- ========================================================
-- 04_enrollments.sql
-- Người thực hiện: Thong
-- Nhiệm vụ: Tạo enrollments (học viên đăng ký khóa học)
-- ========================================================
INSERT INTO enrollments (user_id, course_id)
SELECT u.id, c.id
FROM users u, courses c
WHERE u.role = 'student'
AND (
    (u.email = 'tommy@academy.com'
     AND c.title IN ('Modern Web Development with React', 
                     'Flutter for Beginners', 
                     'UI/UX Design for Beginners')
    ) OR
    (u.email = 'hannah@academy.com'
     AND c.title IN ('English Communication for Beginners', 
                     'Translation and Interpretation Basics')
    ) OR
    (u.email = 'kevin@academy.com'
     AND c.title IN ('Digital Marketing 101', 
                     'Social Media Marketing Strategy', 
                     'Adobe Photoshop Masterclass')
    ) OR
    (u.email = 'lily@academy.com'
     AND c.title IN ('Japanese Language N5 Preparation', 
                     'Korean for Everyday Conversation', 
                     'English Communication for Beginners')
    ) OR
    (u.email = 'jason@academy.com'
     AND c.title IN ('Introduction to Cybersecurity', 
                     'AWS Cloud Fundamentals')
    ) OR
    (u.email = 'sarah@academy.com'
     AND c.title IN ('UI/UX Design for Beginners', 
                     'Adobe Photoshop Masterclass', 
                     'Digital Marketing 101')
    ) OR
    (u.email = 'ryan@academy.com'
     AND c.title IN ('Modern Web Development with React', 
                     'AWS Cloud Fundamentals', 
                     'Social Media Marketing Strategy')
    ) OR
    (u.email = 'amy@academy.com'
     AND c.title IN ('Korean for Everyday Conversation', 
                     'English Communication for Beginners', 
                     'Translation and Interpretation Basics')
    )
<<<<<<< HEAD
        -- =====================================================================
-- 05_watchlist_progress.sql
-- Người thực hiện: Bao
-- Nhiệm vụ: Tạo dữ liệu demo cho Watchlist (~20) và Progress (~10)
-- =====================================================================

WITH student_ids AS (
    -- Lấy ID của các sinh viên
    SELECT id, email FROM users WHERE role = 'student'
),
course_details AS (
    -- Lấy ID của các khóa học
    SELECT id, title FROM courses
),
lesson_details AS (
    -- Lấy ID và thời lượng của các bài học được sử dụng trong Progress
    SELECT id, title, duration_sec 
    FROM lessons 
    WHERE title IN (
        'What is React?', 'Props and State', 'Using useState and useEffect',
        'What is Cloud Computing?', 'Amazon EC2 and S3', 'Deploying on AWS Lambda',
        'Understanding Threats', 
        'Design Thinking Basics', 'Using Figma', 'Testing Techniques'
    )
),
-- 1. WATCHLIST (Danh sách yêu thích) - 20 bản ghi
watchlist_insert AS (
    INSERT INTO watchlist (user_id, course_id)
    VALUES
    -- Tommy Pham (ID: 7) thích 5 khóa
    ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_details WHERE title = 'Flutter for Beginners')),
    ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_details WHERE title = 'Introduction to Cybersecurity')),
    ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_details WHERE title = 'UI/UX Design for Beginners')),
    ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_details WHERE title = 'Digital Marketing 101')),
    ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_details WHERE title = 'Japanese Language N5 Preparation')),

    -- Hannah Vu (ID: 8) thích 5 khóa
    ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_details WHERE title = 'Modern Web Development with React')),
    ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_details WHERE title = 'AWS Cloud Fundamentals')),
    ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_details WHERE title = 'Adobe Photoshop Masterclass')),
    ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_details WHERE title = 'Social Media Marketing Strategy')),
    ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_details WHERE title = 'Korean for Everyday Conversation')),

    -- Kevin Do (ID: 9) thích 5 khóa
    ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_details WHERE title = 'Flutter for Beginners')),
    ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_details WHERE title = 'Introduction to Cybersecurity')),
    ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_details WHERE title = 'UI/UX Design for Beginners')),
    ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_details WHERE title = 'Digital Marketing 101')),
    ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_details WHERE title = 'Japanese Language N5 Preparation')),

    -- Lily Tran (ID: 10) thích 5 khóa
    ((SELECT id FROM student_ids WHERE email = 'lily@academy.com'), (SELECT id FROM course_details WHERE title = 'Modern Web Development with React')),
    ((SELECT id FROM student_ids WHERE email = 'lily@academy.com'), (SELECT id FROM course_details WHERE title = 'AWS Cloud Fundamentals')),
    ((SELECT id FROM student_ids WHERE email = 'lily@academy.com'), (SELECT id FROM course_details WHERE title = 'Adobe Photoshop Masterclass')),
    ((SELECT id FROM student_ids WHERE email = 'lily@academy.com'), (SELECT id FROM course_details WHERE title = 'Social Media Marketing Strategy')),
    ((SELECT id FROM student_ids WHERE email = 'lily@academy.com'), (SELECT id FROM course_details WHERE title = 'Korean for Everyday Conversation'))
    RETURNING 1
),
-- 2. ENROLLMENTS (Chèn thêm enrollments cần thiết cho 3 người dùng demo progress)
enrollment_data AS (
    INSERT INTO enrollments (user_id, course_id, purchased_at)
    VALUES
    -- Đây là các enrollment đã được thêm trong script trước, cần thêm lại vì logic enrollment của bạn bị thiếu scope
    ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_details WHERE title = 'Modern Web Development with React'), now() - interval '30 days'),
    ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_details WHERE title = 'AWS Cloud Fundamentals'), now() - interval '20 days'),
    ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_details WHERE title = 'UI/UX Design for Beginners'), now() - interval '15 days')
    ON CONFLICT (user_id, course_id) DO NOTHING -- Tránh lỗi nếu enrollment đã tồn tại từ script 04_enrollments.sql
    RETURNING 1
)
-- 3. PROGRESS (Tiến độ học tập) - 10 bản ghi
INSERT INTO progress (user_id, lesson_id, watched_sec, is_done, updated_at)
SELECT * FROM (
VALUES
    -- Tommy Pham (ID: 7) - Khóa React
    ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM lesson_details WHERE title='What is React?'), (SELECT duration_sec FROM lesson_details WHERE title='What is React?'), TRUE, now() - interval '25 days'),
    ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM lesson_details WHERE title='Props and State'), (SELECT duration_sec/2 FROM lesson_details WHERE title='Props and State'), FALSE, now() - interval '20 days'),
    ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM lesson_details WHERE title='Using useState and useEffect'), 60, FALSE, now() - interval '10 days'),
=======
);


-- =====================================================================
-- 05_watchlist_progress.sql (Final Unified Version)
-- Người thực hiện: Bao + Zeno
-- Mục tiêu: Gộp WATCHLIST + PROGRESS chạy 1 lần, giữ nguyên chức năng
-- =====================================================================

DO $$
BEGIN
  -- 1️⃣ WATCHLIST (Danh sách yêu thích) - ~20 bản ghi
  WITH student_ids AS (
      SELECT id, email FROM users WHERE role = 'student'
  ),
  course_ids AS (
      SELECT id, title FROM courses
  ),
  lesson_ids AS (
      SELECT id, section_id, duration_sec FROM lessons LIMIT 10
  )
  INSERT INTO watchlist (user_id, course_id)
  VALUES
  -- Tommy Pham (ID: 7)
  ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_ids WHERE title = 'Flutter for Beginners')),
  ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_ids WHERE title = 'Introduction to Cybersecurity')),
  ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_ids WHERE title = 'UI/UX Design for Beginners')),
  ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_ids WHERE title = 'Digital Marketing 101')),
  ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'), (SELECT id FROM course_ids WHERE title = 'Japanese Language N5 Preparation')),

  -- Hannah Vu (ID: 8)
  ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_ids WHERE title = 'Modern Web Development with React')),
  ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_ids WHERE title = 'AWS Cloud Fundamentals')),
  ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_ids WHERE title = 'Adobe Photoshop Masterclass')),
  ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_ids WHERE title = 'Social Media Marketing Strategy')),
  ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM course_ids WHERE title = 'Korean for Everyday Conversation')),

  -- Kevin Do (ID: 9)
  ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_ids WHERE title = 'Flutter for Beginners')),
  ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_ids WHERE title = 'Introduction to Cybersecurity')),
  ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_ids WHERE title = 'UI/UX Design for Beginners')),
  ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_ids WHERE title = 'Digital Marketing 101')),
  ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM course_ids WHERE title = 'Japanese Language N5 Preparation')),

  -- Lily Tran (ID: 10)
  ((SELECT id FROM student_ids WHERE email = 'lily@academy.com'), (SELECT id FROM course_ids WHERE title = 'Modern Web Development with React')),
  ((SELECT id FROM student_ids WHERE email = 'lily@academy.com'), (SELECT id FROM course_ids WHERE title = 'AWS Cloud Fundamentals')),
  ((SELECT id FROM student_ids WHERE email = 'lily@academy.com'), (SELECT id FROM course_ids WHERE title = 'Adobe Photoshop Masterclass')),
  ((SELECT id FROM student_ids WHERE email = 'lily@academy.com'), (SELECT id FROM course_ids WHERE title = 'Social Media Marketing Strategy')),
  ((SELECT id FROM student_ids WHERE email = 'lily@academy.com'), (SELECT id FROM course_ids WHERE title = 'Korean for Everyday Conversation'))
  ON CONFLICT DO NOTHING;
END $$;


DO $$
BEGIN
  -- 2️⃣ PROGRESS (Tiến độ học tập) - ~10 bản ghi
  WITH student_ids AS (
      SELECT id, email FROM users WHERE role = 'student'
  ),
  course_ids AS (
      SELECT id, title FROM courses
  ),
  lesson_ids AS (
      SELECT id, section_id, duration_sec FROM lessons LIMIT 10
  )
  INSERT INTO progress (user_id, lesson_id, watched_sec, is_done, updated_at)
  VALUES
  -- Tommy Pham (React)
  ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'),
   (SELECT id FROM lessons WHERE title='What is React?'),
   (SELECT duration_sec FROM lessons WHERE title='What is React?'),
   TRUE, now() - interval '25 days'),

  ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'),
   (SELECT id FROM lessons WHERE title='Props and State'),
   (SELECT duration_sec/2 FROM lessons WHERE title='Props and State'),
   FALSE, now() - interval '20 days'),

  ((SELECT id FROM student_ids WHERE email = 'tommy@academy.com'),
   (SELECT id FROM lessons WHERE title='Using useState and useEffect'),
   60, FALSE, now() - interval '10 days'),

  -- Hannah Vu (AWS Cloud)
  ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'),
   (SELECT id FROM lessons WHERE title='What is Cloud Computing?'),
   (SELECT duration_sec FROM lessons WHERE title='What is Cloud Computing?'),
   TRUE, now() - interval '18 days'),

  ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'),
   (SELECT id FROM lessons WHERE title='Amazon EC2 and S3'),
   (SELECT duration_sec FROM lessons WHERE title='Amazon EC2 and S3'),
   TRUE, now() - interval '15 days'),

  ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'),
   (SELECT id FROM lessons WHERE title='Deploying on AWS Lambda'),
   (SELECT duration_sec*3/4 FROM lessons WHERE title='Deploying on AWS Lambda'),
   FALSE, now() - interval '5 days'),

  ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'),
   (SELECT id FROM lessons WHERE title='Understanding Threats'),
   (SELECT duration_sec/2 FROM lessons WHERE title='Understanding Threats'),
   FALSE, now() - interval '1 days'),

  -- Kevin Do (UI/UX)
  ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'),
   (SELECT id FROM lessons WHERE title='Design Thinking Basics'),
   (SELECT duration_sec FROM lessons WHERE title='Design Thinking Basics'),
   TRUE, now() - interval '10 days'),

  ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'),
   (SELECT id FROM lessons WHERE title='Using Figma'),
   (SELECT duration_sec*9/10 FROM lessons WHERE title='Using Figma'),
   FALSE, now() - interval '5 days'),

  ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'),
   (SELECT id FROM lessons WHERE title='Testing Techniques'),
   0, FALSE, now() - interval '1 days')
  ON CONFLICT DO NOTHING;
END $$;


-- ========================================================
-- 06_reviews.sql
-- Người thực hiện: Phúc
-- Nhiệm vụ: Tạo dữ liệu đánh giá (reviews)
-- Mỗi khóa học có khoảng 4–5 đánh giá từ các học viên
-- ========================================================

-- Giả định: bảng reviews có các cột:
-- id | user_id | course_id | rating | comment | created_at

INSERT INTO reviews (user_id, course_id, rating, comment, created_at)
VALUES
-- ========================================================
-- 1️⃣ Modern Web Development with React (5 reviews)
-- ========================================================
((SELECT id FROM users WHERE email='tommy@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Modern Web Development with React' LIMIT 1),
 5, 'Amazing course! Helped me understand React clearly.', now() - interval '28 days'),

((SELECT id FROM users WHERE email='hannah@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Modern Web Development with React' LIMIT 1),
 4, 'Good content, but could use more hands-on coding.', now() - interval '26 days'),

((SELECT id FROM users WHERE email='kevin@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Modern Web Development with React' LIMIT 1),
 5, 'Instructor explains concepts very well. Loved it!', now() - interval '23 days'),

((SELECT id FROM users WHERE email='lily@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Modern Web Development with React' LIMIT 1),
 4, 'Nice structure, examples are clear and helpful.', now() - interval '20 days'),

((SELECT id FROM users WHERE email='amy@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Modern Web Development with React' LIMIT 1),
 5, 'Very practical and beginner-friendly!', now() - interval '19 days'),


-- ========================================================
-- 2️⃣ Flutter for Beginners (4 reviews)
-- ========================================================
((SELECT id FROM users WHERE email='tommy@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Flutter for Beginners' LIMIT 1),
 4, 'Good for starting Flutter, nice step-by-step approach.', now() - interval '25 days'),

((SELECT id FROM users WHERE email='jason@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Flutter for Beginners' LIMIT 1),
 5, 'Really fun! I built my first app after this course.', now() - interval '22 days'),

((SELECT id FROM users WHERE email='ryan@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Flutter for Beginners' LIMIT 1),
 4, 'Great visuals, a bit fast in advanced parts though.', now() - interval '18 days'),

((SELECT id FROM users WHERE email='sarah@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Flutter for Beginners' LIMIT 1),
 5, 'Loved it! The lessons were clear and easy to follow.', now() - interval '16 days'),


-- ========================================================
-- 3️⃣ AWS Cloud Fundamentals (5 reviews)
-- ========================================================
((SELECT id FROM users WHERE email='hannah@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='AWS Cloud Fundamentals' LIMIT 1),
 5, 'Excellent introduction to AWS core services.', now() - interval '14 days'),

((SELECT id FROM users WHERE email='tommy@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='AWS Cloud Fundamentals' LIMIT 1),
 4, 'Good overview, I liked the EC2 and S3 labs.', now() - interval '12 days'),

((SELECT id FROM users WHERE email='kevin@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='AWS Cloud Fundamentals' LIMIT 1),
 5, 'Super useful and very up-to-date.', now() - interval '10 days'),

((SELECT id FROM users WHERE email='amy@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='AWS Cloud Fundamentals' LIMIT 1),
 4, 'Clear explanations, could use more practice examples.', now() - interval '8 days'),

((SELECT id FROM users WHERE email='ryan@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='AWS Cloud Fundamentals' LIMIT 1),
 5, 'Perfect for beginners to cloud computing!', now() - interval '6 days'),
>>>>>>> 54841f8b6cd5fd7f31a08b3242a5d0b8bc6e5e83

    -- Hannah Vu (ID: 8) - Khóa AWS Cloud
    ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM lesson_details WHERE title='What is Cloud Computing?'), (SELECT duration_sec FROM lesson_details WHERE title='What is Cloud Computing?'), TRUE, now() - interval '18 days'),
    ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM lesson_details WHERE title='Amazon EC2 and S3'), (SELECT duration_sec FROM lesson_details WHERE title='Amazon EC2 and S3'), TRUE, now() - interval '15 days'),
    ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM lesson_details WHERE title='Deploying on AWS Lambda'), (SELECT duration_sec*3/4 FROM lesson_details WHERE title='Deploying on AWS Lambda'), FALSE, now() - interval '5 days'),
    ((SELECT id FROM student_ids WHERE email = 'hannah@academy.com'), (SELECT id FROM lesson_details WHERE title='Understanding Threats'), (SELECT duration_sec/2 FROM lesson_details WHERE title='Understanding Threats'), FALSE, now() - interval '1 days'), -- Bài xem trước

<<<<<<< HEAD
    -- Kevin Do (ID: 9) - Khóa UI/UX Design
    ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM lesson_details WHERE title='Design Thinking Basics'), (SELECT duration_sec FROM lesson_details WHERE title='Design Thinking Basics'), TRUE, now() - interval '10 days'),
    ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM lesson_details WHERE title='Using Figma'), (SELECT duration_sec*9/10 FROM lesson_details WHERE title='Using Figma'), FALSE, now() - interval '5 days'),
    ((SELECT id FROM student_ids WHERE email = 'kevin@academy.com'), (SELECT id FROM lesson_details WHERE title='Testing Techniques'), 0, FALSE, now() - interval '1 days')
) AS progress_values (user_id, lesson_id, watched_sec, is_done, updated_at);
);
=======
-- ========================================================
-- 4️⃣ UI/UX Design for Beginners (4 reviews)
-- ========================================================
((SELECT id FROM users WHERE email='kevin@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='UI/UX Design for Beginners' LIMIT 1),
 5, 'Loved this course! Strong fundamentals in design.', now() - interval '10 days'),

((SELECT id FROM users WHERE email='tommy@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='UI/UX Design for Beginners' LIMIT 1),
 4, 'Nice visuals, Figma lessons were really cool.', now() - interval '8 days'),

((SELECT id FROM users WHERE email='sarah@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='UI/UX Design for Beginners' LIMIT 1),
 5, 'Great mix of theory and practice.', now() - interval '7 days'),

((SELECT id FROM users WHERE email='lily@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='UI/UX Design for Beginners' LIMIT 1),
 4, 'Could use more design challenges, but very good.', now() - interval '5 days'),


-- ========================================================
-- 5️⃣ Digital Marketing 101 (5 reviews)
-- ========================================================
((SELECT id FROM users WHERE email='amy@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Digital Marketing 101' LIMIT 1),
 5, 'Fantastic course! I learned SEO and Ads basics.', now() - interval '6 days'),

((SELECT id FROM users WHERE email='tommy@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Digital Marketing 101' LIMIT 1),
 4, 'Good examples, very practical for real-world work.', now() - interval '5 days'),

((SELECT id FROM users WHERE email='hannah@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Digital Marketing 101' LIMIT 1),
 5, 'Clear structure, easy to follow.', now() - interval '4 days'),

((SELECT id FROM users WHERE email='jason@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Digital Marketing 101' LIMIT 1),
 5, 'Loved the instructor energy, great intro to marketing!', now() - interval '3 days'),

((SELECT id FROM users WHERE email='ryan@academy.com' LIMIT 1),
 (SELECT id FROM courses WHERE title='Digital Marketing 101' LIMIT 1),
 4, 'Helpful but could use more case studies.', now() - interval '2 days');
-- ========================================================
-- 07_update_stats.sql + 08_sanity_check.sql
-- Người thực hiện: VŨ
-- Nhiệm vụ:
--   07: Cập nhật số học viên và đánh giá trung bình cho khóa học
--   08: Kiểm tra tổng quan DB + test FTS
-- ========================================================

-- ========================================================
-- 07: CẬP NHẬT THỐNG KÊ KHÓA HỌC
-- ========================================================

-- 1. Cập nhật số học viên (students_count) cho mỗi khóa
UPDATE courses c
SET students_count = sub.cnt
FROM (
  SELECT course_id, COUNT(*) AS cnt
  FROM enrollments
  GROUP BY course_id
) sub
WHERE c.id = sub.course_id;

-- 2. Cập nhật số đánh giá (rating_count) và điểm trung bình (rating_avg)
UPDATE courses c
SET rating_avg = sub.avg, rating_count = sub.cnt
FROM (
  SELECT course_id, ROUND(AVG(rating), 2) AS avg, COUNT(*) AS cnt
  FROM reviews
  GROUP BY course_id
) sub
WHERE c.id = sub.course_id;

-- 3. Cập nhật số view (view_count) của mỗi course
UPDATE courses
SET view_count = FLOOR(100 + random() * 900); -- tạo số ngẫu nhiên 100–999


-- ========================================================
-- 08: SANITY CHECK + FTS TEST
-- ========================================================

-- 1. Tổng số bản ghi của tất cả bảng (gộp bằng UNION ALL)
SELECT 'categories' AS table_name, COUNT(*) AS total FROM categories
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'sections', COUNT(*) FROM sections
UNION ALL
SELECT 'lessons', COUNT(*) FROM lessons
UNION ALL
SELECT 'enrollments', COUNT(*) FROM enrollments
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'watchlist', COUNT(*) FROM watchlist;

-- 2. Test FTS: tìm các khóa học chứa từ khóa 'web'
SELECT id, title
FROM courses
WHERE fts @@ to_tsquery('web');
