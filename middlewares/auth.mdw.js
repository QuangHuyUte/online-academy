
export function authRequired(req, res, next) {
  if (!req.session?.auth || !req.session.user) {
    res.flash('warning', 'Vui lòng đăng nhập.');
    return res.redirect('/account/login');
  }
  next();
}


export function requireAdmin(req, res, next) {
  if (req.session.user?.role !== 'admin') {
    res.flash('danger', 'Bạn không có quyền truy cập trang quản trị.');
    return res.redirect('/');
  }
  next();
}

export function requireInstructor(req, res, next) {
  if (req.session.user?.role !== 'instructor') {
    res.flash('danger', 'Chỉ giảng viên mới được truy cập trang này.');
    return res.redirect('/');
  }
  next();
}
