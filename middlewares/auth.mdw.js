// middleware/auth.mdw.js
export function authRequired(req, res, next) {
  if (!req.session?.auth || !req.session.user) {
    req.session.flash = { type: 'warning', message: 'Vui lòng đăng nhập.' };
    return res.redirect('/account/login');
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (req.session.user?.role !== 'admin') return res.sendStatus(403);
  next();
}
