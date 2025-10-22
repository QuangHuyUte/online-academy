// middlewares/auth.mdw.js

/** Kiểm tra user đã đăng nhập chưa */
export function authRequired(req, res, next) {
  if (!req.session?.auth || !req.session.user) {
    req.session.flash = { type: 'warning', message: 'Vui lòng đăng nhập.' };
    return res.redirect('/account/login');
  }
  next();
}

/** Giới hạn truy cập admin */
export function requireAdmin(req, res, next) {
  if (req.session.user?.role !== 'admin') {
    return res.sendStatus(403);
  }
  next();
}

/** Giới hạn truy cập instructor */
export function requireInstructor(req, res, next) {
  if (req.session.user?.role !== 'instructor') {
    return res.sendStatus(403);
  }
  next();
}
