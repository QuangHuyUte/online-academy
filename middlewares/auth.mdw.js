// middlewares/auth.mdw.js

// Bắt buộc đã đăng nhập
export function authRequired(req, res, next) {
  // Cả hai trường hợp: session.auth hoặc isAuthenticated đều được
  const loggedIn = req.session?.auth || req.session?.isAuthenticated;
  const user = req.session?.user || req.session?.authUser;
  if (!loggedIn || !user) {
    res.flash?.('warning', 'Vui lòng đăng nhập.');
    // Ghi nhớ trang cũ để quay lại sau login (nếu muốn)
    req.session.returnUrl = req.originalUrl;
    return res.redirect('/account/login');
  }
  next();
}

// Chỉ admin mới truy cập
export function requireAdmin(req, res, next) {
  const user = req.session?.user || req.session?.authUser;
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

/* ---------------- ALIAS cho tương thích nhánh cũ ---------------- */

// alias cho checkAuthenticated (giống authRequired)
export const checkAuthenticated = authRequired;

// alias cho restrictAdmin (giống requireAdmin)
export const restrictAdmin = requireAdmin;
