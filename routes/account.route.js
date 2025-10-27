import express from 'express';
import bcrypt from 'bcryptjs';
import userModel from '../models/user.model.js';
import passport from 'passport';
import { checkAuthenticated } from '../middlewares/auth.mdw.js';
import otpModel, { generateOTP } from '../models/otp.model.js';

const router = express.Router();

router.post('/send-otp', async function (req, res) {
    const email = req.body.email;
    const existingUser = await userModel.findByEmail(email);
    
    // Đảm bảo email chưa được đăng ký
    if (existingUser) {
        return res.json({ success: false, message: 'Email đã được sử dụng.' });
    }

    const otp = generateOTP(); 
    
    try {
        await otpModel.add(email, otp);

        console.log(`[DATABASE OTP Đăng ký]: Mã OTP cho ${email} là ${otp}`);
        
        req.session.emailToVerify = email; 

        return res.json({ success: true, mock_code: otp }); 

    } catch (error) {
        console.error('Lỗi khi lưu OTP vào DB:', error);
        return res.json({ success: false, message: 'Lỗi server khi tạo OTP.' });
    }
});

router.post('/verify-otp', async function (req, res) {
    const { email, otp } = req.body;
    
    const otpRecord = await otpModel.findByEmailAndOtp(email, otp);
    
    if (!otpRecord) {
        return res.json({ success: false, message: 'Mã OTP không đúng hoặc đã hết hạn.' });
    }

    req.session.verifiedEmail = email;
    
    await otpModel.deleteOtp(email); 

    return res.json({ success: true, message: 'Xác thực OTP thành công.' });
});

router.get('/signup', function (req, res) {
    res.render('vwAccounts/signup');
});

router.get('/is-available', async function(req, res) {
    const email = req.query.email;
    const user = await userModel.findByEmail(email);
    if(user) {
        return res.json(false);
    }   
    return res.json(true);
});

router.get('/is-password-correct', async function(req, res) {
    const email = req.query.email;
    const password = req.query.password;
    console.log(email, password);
    const user = await userModel.findByEmail(email);
    if(!user) {
        return res.json(false);
    }
    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if(isValidPassword===false) {
        return res.json(false);
    }
    return res.json(true);
});



router.post('/signup', async function (req, res) {
    const isEmailVerified = req.session.verifiedEmail === req.body.email;
    
    if (!isEmailVerified) {
        return res.render('vwAccounts/signup', { 
            error: true, 
            message: 'Vui lòng xác thực OTP trước khi đăng ký.' 
        });
    }

    const existingUser = await userModel.findByEmail(req.body.email);
    if (existingUser) {
        delete req.session.verifiedEmail; 
        return res.render('vwAccounts/signup', { 
            error: true, 
            message: 'Email đã tồn tại.' 
        });
    }

    const hash  = bcrypt.hashSync(req.body.password, 10);
    const user = {
        name: req.body.name,
        password_hash: hash,
        role: req.body.role,
        email: req.body.email,
        created_at: new Date(),
    };

    await userModel.add(user);
    
    delete req.session.verifiedEmail; 
    
    res.render('vwAccounts/signin');
});

router.get('/signin', async function (req, res) {
    res.render('vwAccounts/signin');
});

router.post('/signin', async function (req, res) {
    const user = await userModel.findByEmail(req.body.email);
    if (!user) {
        return res.render('vwAccounts/signin', { error: true });
    }   
    if (!user) {
        return res.render('vwAccounts/signin', { error: true });
    }
    const isValidPassword = bcrypt.compareSync(req.body.password, user.password_hash);
    if (isValidPassword===false) {
        return res.render('vwAccounts/signin', { error: true });
    }
    req.session.isAuthenticated = true;
    req.session.authUser = user
    
    const url = req.session.url || '/';
    delete req.session.url;
    res.redirect(url);
});

router.post('/signout', function (req, res) {
    req.session.isAuthenticated = false;
    req.session.authUser = null;
    res.redirect(req.headers.referer);
});

router.get('/profile', checkAuthenticated, function (req, res) {
    res.render('vwAccounts/profile',{
        user: req.session.authUser,
    });
});

router.post('/profile', checkAuthenticated, async function (req, res) {
    const id = req.session.authUser.id;
    const user = {
        name: req.body.name,
        email: req.body.email,
    };
    await userModel.patch(id, user);
    req.session.authUser.name = user.name;
    req.session.authUser.email = user.email;

    res.render('vwAccounts/profile', {
        user: req.session.authUser,
        message: 'Profile updated successfully!'
    });
});

router.get('/changePassword', checkAuthenticated, function (req, res) {
    res.render('vwAccounts/change-pwd',{
        Error: req.query.error,
        user: req.session.authUser,
    });
});

router.post('/changePassword', checkAuthenticated, async function (req, res) {
    const id = req.body.id;
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    const ret = bcrypt.compareSync(currentPassword, req.session.authUser.password_hash);
    if (ret===false)
        return res.render('vwAccounts/change-pwd',{
            user: req.session.authUser,
            error: true
        });
    
    const hash_password = bcrypt.hashSync(newPassword, 10);
    const user = {
        password_hash: hash_password,
    }
    await userModel.patch(id, user);
    req.session.authUser.password_hash = hash_password;
    res.render('vwAccounts/change-pwd',{
        user: req.session.authUser,
    });
});

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/account/signin' }),
    async function(req, res) {
        // Successful authentication via Passport; ensure session flags and redirect.
        try {
            // req.user should be populated by passport.deserializeUser
            if (req.user) {
                req.session.isAuthenticated = true;
                req.session.authUser = req.user;
            }
        } catch (e) {
            console.error('Error saving auth session after Google callback', e);
        }
        const url = req.session.url || '/';
        delete req.session.url;
        res.redirect(url);
    });
export default router;
