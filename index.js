const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const flash = require('connect-flash');

const isLoggedIn = require('./middleware');

const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');

const User = require('./models/user')

const ExpressError = require('./utils/expressError');
const catchAsync = require('./utils/catchAsync');

mongoose.connect('mongodb://127.0.0.1:27017/authentication')
    .then((data) => {
        console.log("CONNECTION ESTABLISHED.")
    })
    .catch(err => {
        console.log("Error while connecting !!!");
    })

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static('static'));

app.use(flash());

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60,
        maxAge: 1000 * 60 * 60
    }
}));

// to initialize passport
app.use(passport.initialize());

// to enable out application to use persistent login
app.use(passport.session())

passport.use(new LocalStrategy(User.authenticate()))

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.get('/', (req, res) => {
    res.render('index');
})

app.post('/register', catchAsync(async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email });

        await User.register(user, password);

        req.login(user, (err) => {
            if(err) throw err;
            req.flash('success', 'Welcome');
            res.redirect('/admin');
        })

    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/')
    }
    
}));

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/' }), (req, res) => {
    req.flash('success', 'Welcome !!!');
    res.redirect('/admin');
})


app.get('/admin', isLoggedIn, (req, res) => {
    res.render('admin');
})

app.get('/logout', (req, res) => {
    req.logout(function (err) {
        if(err) return next(err);
        req.flash('success', 'Goodbye !!!');
        res.redirect('/');
    });
})

app.all('*', (req, res, next) => {
    next(new ExpressError(404, 'Invalid route...'));
})

app.use((err, req, res, next) => {
    const { status = 404 } = err;
    if (!err.message) err.message = 'Something went wrong :(';
    res.send(err.message);
})


app.listen(1112, () => {
    console.log('LISTENING ON 1112...');
})