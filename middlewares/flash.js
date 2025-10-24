export default function flash(req, res, next) {
  // helper gắn flash từ route: res.flash('success', 'Saved!')
  res.flash = (type, message) => {
    req.session.__flash = req.session.__flash || {};
    req.session.__flash[type] = message;
  };

  // đẩy ra locals và xoá sau 1 vòng đời
  const bag = req.session.__flash || {};
  res.locals.success = bag.success;
  res.locals.error = bag.error;
  delete req.session.__flash;

  next();
}
