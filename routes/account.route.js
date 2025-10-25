import express from 'express';
import bcrypt from 'bcryptjs';
import userModel from '../models/user.model.js';
import { checkAuthenticated } from '../middlewares/auth.mdw.js';

const router = express.Router();

router.post('/send-otp', async function (req, res) {
    const email = req.body.email;
    const mockOtp = '123456'; // Mã OTP cố định (mock)
    
    // Lưu mã OTP vào session 
    req.session.otp = {
        code: mockOtp,
        email: email,
        timestamp: Date.now(),
        expires: 5 * 60 * 1000 // Hạn 5 phút
    };

    console.log(`[MOCK OTP Đăng ký]: Mã OTP giả lập cho ${email} là ${mockOtp}`);
    
    return res.json({ success: true, mock_code: mockOtp });
});

router.post('/verify-otp', async function (req, res) {
    const {email, otp} = req.body;
    const sessionOtp = req.session.otp;
    if (!sessionOtp || sessionOtp.email !== email) {
        return res.json({ success: false, message: 'Yêu cầu không hợp lệ hoặc email không khớp.' });
    }

    if (Date.now() - sessionOtp.timestamp > sessionOtp.expires) {
        delete req.session.otp;
        return res.json({ success: false, message: 'Mã OTP đã hết hạn.' });
    }

    if (otp === sessionOtp.code) {
        // Đặt cờ verified trong session. 
        req.session.otp.verified = true;
        return res.json({ success: true, message: 'Xác thực OTP thành công.' });
    } else {
        return res.json({ success: false, message: 'Mã OTP không đúng.' });
    }
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
    // 1. Kiểm tra xác nhận OTP trong session
    const isOtpVerified = req.session.otp && req.session.otp.verified === true && req.session.otp.email === req.body.email;
    
    if (!isOtpVerified) {
        // Trả lại trang đăng ký với thông báo lỗi
        return res.render('vwAccounts/signup', { 
            error: true, 
            message: 'Vui lòng xác thực OTP trước khi đăng ký.' 
        });
    }

    // 2. Kiểm tra lại email không trùng (bảo vệ lần cuối ở backend)
    const existingUser = await userModel.findByEmail(req.body.email);
    if (existingUser) {
        delete req.session.otp; 
        return res.render('vwAccounts/signup', { 
            error: true, 
            message: 'Email đã tồn tại.' 
        });
    }

    // 3. Tiến hành đăng ký (Logic cũ)
    const hash  = bcrypt.hashSync(req.body.password, 10);
    const user = {
        name: req.body.name,
        password_hash: hash,
        role: req.body.role,
        email: req.body.email,
        created_at: new Date(),
    };

    await userModel.add(user);
    
    // 4. Dọn dẹp session sau khi thành công
    delete req.session.otp;
    
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
        role: req.body.role,
    };
    await userModel.patch(id, user);
    req.session.authUser.name = user.name;
    req.session.authUser.email = user.email;
    req.session.authUser.role = user.role;

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
export default router;
