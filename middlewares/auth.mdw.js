export function restrictAdmin() { 
  if(req.session.authUser.permission !== 1){
        return res.render('403');
    }
    next();
}

export function checkAuthenticated(req, res, next) {
    if(!req.session.isAuthenticated){
        req.session.url = req.originalUrl;
        return res.redirect('/account/signin');
    }
    next();
}