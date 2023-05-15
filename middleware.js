const isLoggedIn = (req, res, next) => {
    if(!req.isAuthenticated()) {
        req.flash('error', 'You have to login first.')
        return res.redirect('/');
    }
    next();
}

module.exports = isLoggedIn;