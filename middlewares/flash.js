export default function flash(req, res, next) {
  res.flash = (type, message) => {
    req.session.__flash = req.session.__flash || {};
    req.session.__flash[type] = message;
  };

  const bag = req.session.__flash || {};
  // Đẩy tất cả keys ra locals (success/error/warning/danger/info...)
  Object.assign(res.locals, bag);
  delete req.session.__flash;

  next();
}
