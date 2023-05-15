const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const bcrypt = require('bcrypt');

const flash = require('connect-flash');

const isLoggedIn = require('./middleware');

const session = require('express-session');

const User = require('./models/user');
const RegisterOtp = require('./models/registerOtp');
const LoginOtp = require('./models/loginOtp');

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


app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.get('/', (req, res) => {
    res.render('index');
})

app.post('/register', catchAsync(async (req, res, next) => {
    // try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password });
    
    const ifExists = await user.checkExists();
    if(ifExists) {
        req.flash('error', 'Username or email already exists !!!');
        return req.redirect('/');
    }
    const x = await user.save();

    req.session.user = email;

    const otp = new RegisterOtp({
        expiresAt : Date.now() + 1000 * 30,
        password: generateOtp()
    })
    otp.user_id = user;
    await otp.save().then((d) => console.log(d));

    res.redirect('/register/verify');
}));

app.post('/login', catchAsync( async(req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({'username': username})

    if(!user) {
        req.flash('error', 'Invalid credentials !!!');
        return res.redirect('/');
    }

    const result = await bcrypt.compare(password, user.password);

    console.log(result);

    if(result) {
        req.session.user = user.email;
        req.session.verified = null;


        const otp = new RegisterOtp({
            expiresAt : Date.now() + 1000 * 30,
            password: generateOtp()
        })
        otp.user_id = user;
        await otp.save().then((d) => console.log(d));

        return res.redirect('/login/verify');
    }
    req.flash('error', 'Invalid credentials !!!');
    res.redirect('/');
}))


app.get('/login/verify', catchAsync(async (req, res) => {
    res.render('loginotp');
}))


app.get('/register/verify', catchAsync(async (req, res) => {
    res.render('otp');
}))



app.post('/login/verify', catchAsync(async (req, res) => {

    const userOtp = Number(Object.values(req.body).join(''));
    
    const activeUser = await User.findOne({'email': req.session.user});
    
    const otp = await RegisterOtp.findOne({'user_id': activeUser});

    if(otp.expiresAt > Date.now()) {
        if(otp.password !== userOtp) {
            req.flash('error', 'Incorrect Otp !!!');
            return res.redirect('/login/verify');
        } else {

            // await User.findOneAndUpdate({'email': req.session.user}, {'verified': true}, {new: true}).then((d) => console.log(d));
            
            req.session.verified=true;
            await RegisterOtp.deleteMany({'user_id': activeUser});

            // req.session.user = null;
            
            // req.flash('success', 'You are successfully verified.\n Please login with your credentials !!!');

            res.redirect('/admin');
        }
    } else {
        await RegisterOtp.deleteMany({'user_id': activeUser});

        req.flash('error', 'Otp expired !!!. Resend it');
        res.redirect('/login/verify');
    }
}))

app.get('/login/verify/resend', catchAsync(async (req, res) => {
    const currentUser = await User.findOne({'email': req.session.user});

    const otp = new RegisterOtp({
        expiresAt : Date.now() + 1000 * 30,
        password: generateOtp()
    })
    otp.user_id = currentUser;

    await otp.save().then((d) => console.log(d));

    res.redirect('/login/verify');
}))



























app.post('/register/verify', catchAsync(async (req, res) => {

    const userOtp = Number(Object.values(req.body).join(''));
    
    const activeUser = await User.findOne({'email': req.session.user});
    
    const otp = await RegisterOtp.findOne({'user_id': activeUser});

    if(otp.expiresAt > Date.now()) {
        if(otp.password !== userOtp) {
            req.flash('error', 'Incorrect Otp !!!');
            return res.redirect('/register/verify');
        } else {

            await User.findOneAndUpdate({'email': req.session.user}, {'verified': true}, {new: true}).then((d) => console.log(d));

            await RegisterOtp.deleteMany({'user_id': activeUser});

            req.session.user = null;
            req.session.verified = null;
            
            req.flash('success', 'You are successfully verified.\n Please login with your credentials !!!');

            res.redirect('/');
        }
    } else {
        await RegisterOtp.deleteMany({'user_id': activeUser});

        req.flash('error', 'Otp expired !!!. Resend it');
        res.redirect('/register/verify');
    }
}))

app.get('/register/verify/resend', catchAsync(async (req, res) => {
    const currentUser = await User.findOne({'email': req.session.user});

    const otp = new RegisterOtp({
        expiresAt : Date.now() + 1000 * 30,
        password: generateOtp()
    })
    otp.user_id = currentUser;

    await otp.save().then((d) => console.log(d));

    res.redirect('/register/verify');
}))


app.get('/admin', (req, res) => {
    if(!req.session.verified) {
        req.flash('error', 'You are not logged in.');
        return res.redirect('/');
    }
    const user = req.session.user;
    res.render('admin', { user } );
})

app.get('/logout', (req, res) => {
    if(req.session.user) {
        req.session.user=null;
        req.session.verified=null;
        req.flash('success', 'GoodBye !!!');
        res.redirect('/');
    }

    res.send('Already logged out');
    

})

app.all('*', (req, res, next) => {
    next(new ExpressError(404, 'Invalid route...'));
})

app.use((err, req, res, next) => {
    const { status = 404 } = err;
    if (!err.message) err.message = 'Something went wrong :(';
    res.send(err.message);
})

const generateOtp = () => {
    return Math.floor(Math.random() * 8999) + 1000; 
}


app.listen(1112, () => {
    console.log('LISTENING ON 1112...');
})