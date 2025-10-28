// middlewares/auth.mdw.js

// Bắt buộc đã đăng nhập
export function authRequired(req, res, next) {
  // Hỗ trợ cả 2 kiểu flag session cũ/mới
  const loggedIn = req.session?.auth || req.session?.isAuthenticated;
  const user = req.session?.user || req.session?.authUser;

  if (!loggedIn || !user) {
    res.flash?.('warning', 'Vui lòng đăng nhập.');
    // Ghi nhớ trang cũ để quay lại sau login
    req.session.returnUrl = req.originalUrl;          // 🔁 dùng returnUrl thống nhất
    return res.redirect('/account/signin');           // ✅ đúng route signin
  }
  next();
}

// Chỉ admin
export function requireAdmin(req, res, next) {
  const user = req.session?.user || req.session?.authUser;
  // Hỗ trợ cả role === 'admin' hoặc permission === 1
  if (user?.role !== 'admin' && user?.permission !== 1) {
    res.flash?.('danger', 'Bạn không có quyền truy cập trang quản trị.');
    return res.redirect('/');
  }
  next();
}

// Chỉ instructor (giảng viên)
export function requireInstructor(req, res, next) {
  const user = req.session?.user || req.session?.authUser;
  if (user?.role !== 'instructor') {
    res.flash?.('danger', 'Chỉ giảng viên mới được truy cập trang này.');
    return res.redirect('/');
  }
  next();
}

// (Tuỳ chọn) Chỉ student
export function requireStudent(req, res, next) {
  const user = req.session?.user || req.session?.authUser;
  if (user?.role !== 'student') {
    res.flash?.('danger', 'Chỉ học viên mới được truy cập trang này.');
    return res.redirect('/');
  }
  next();
}

/* ---------------- ALIAS cho tương thích nhánh cũ ---------------- */
export const checkAuthenticated = authRequired;
export const restrictAdmin = requireAdmin;
