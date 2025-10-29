import express from 'express';
import bcrypt from 'bcryptjs';
import userModel from '../models/user.model.js';
import passport from 'passport';
import { checkAuthenticated } from '../middlewares/auth.mdw.js';
import otpModel, { generateOTP } from '../models/otp.model.js';
import watchlistModel from '../models/watchlist.model.js';
import myCourseModel from "../models/myCourse.model.js";
import instructorModel from '../models/instructor.model.js';

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
  try {
    const isEmailVerified = req.session.verifiedEmail === req.body.email;
    if (!isEmailVerified) {
      return res.render('vwAccounts/signup', {
        error: true,
        message: 'Vui lòng xác thực OTP trước khi đăng ký.'
      });
    }

    // 🔹 Check email trùng trước khi insert
    const existingUser = await userModel.findByEmail(req.body.email);
    if (existingUser) {
      delete req.session.verifiedEmail;
      return res.render('vwAccounts/signup', {
        error: true,
        message: 'Email đã tồn tại.'
      });
    }

    // 🔹 Hash password & tạo user object
    const hash = bcrypt.hashSync(req.body.password, 10);
    const user = {
      name: req.body.name,
      email: req.body.email,
      password_hash: hash,
      role: req.body.role,
      created_at: new Date(),
    };

    // 🔹 Thêm user và lấy ID
    const newUserId = await userModel.add(user);
    const id = Array.isArray(newUserId)
      ? newUserId[0]?.id ?? newUserId[0]
      : newUserId?.id ?? newUserId;

    // 🔹 Nếu là instructor → thêm bản ghi instructor
    if (user.role === 'instructor') {
      try {
        const { findByUserId, add } = await import('../models/instructor.model.js');
        const existed = await findByUserId(id);
        if (!existed) {
          await add({ user_id: id });
          console.log(`✅ Added instructor record for user_id=${id}`);
        }
      } catch (err) {
        console.error('❌ Lỗi khi thêm instructor record:', err);
      }
    }

    delete req.session.verifiedEmail;
    res.render('vwAccounts/signin', { success: true });
  } catch (err) {
    console.error('Signup error:', err);
    // 🔹 Nếu trùng email (lỗi UNIQUE constraint)
    if (err.code === '23505') {
      return res.render('vwAccounts/signup', {
        error: true,
        message: 'Email đã được sử dụng. Vui lòng chọn email khác.'
      });
    }

    return res.render('vwAccounts/signup', {
      error: true,
      message: 'Đã xảy ra lỗi trong quá trình đăng ký.'
    });
  }
});


router.get('/signin', async function (req, res) {
    res.render('vwAccounts/signin');
});

// routes/account.route.js  (POST /account/signin)
router.post('/signin', async function (req, res) {
  const { email, password } = req.body;
  const user = await userModel.findByEmail(email);
  if (!user) return res.render('vwAccounts/signin', { error: true });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.render('vwAccounts/signin', { error: true });

  // chuẩn hoá role để middleware so sánh chắc chắn
  const normalized = {
    ...user,
    role: String(user.role || '').toLowerCase().trim(),
  };

  req.session.isAuthenticated = true;
  req.session.authUser = normalized;
  req.session.userId = normalized.id;

  // fallback theo role (đÃ SỬA dynamic import)
  async function getFallbackByRole(u) {
    if (u.role === 'admin') return '/admin/courses';
    if (u.role === 'instructor') {
      try {
        const im = await import('../models/instructor.model.js');
        const me = await im.findByUserId(u.id);            // users.id -> instructors.user_id
        if (me) {
          const rows = await im.findCoursesPage(me.id, 0, 1, { excludeRemoved: true });
          if (rows && rows.length) return `/instructor/courses/${rows[0].id}/content`;
        }
      } catch (e) {
        console.error('Compute instructor fallback error:', e);
      }
      return '/instructor/my-course';
    }
    return '/';
  }

  const fallback = await getFallbackByRole(normalized);
  const returnUrl = req.session.returnUrl || req.session.url;
  delete req.session.returnUrl;
  delete req.session.url;

  req.session.save(() => res.redirect(returnUrl || fallback));
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

// ========== 🧡 WATCHLIST (bạn thêm) ==========
router.get('/watchlist', async (req, res) => {
  // Nếu chưa đăng nhập → reset và ẩn watchlist
  if (!req.session.isAuthenticated || !req.session.authUser) {
    return res.render('vwAccount/watchlist', {
      watchlist: [],
      hasCourses: false,
      message: 'Bạn cần đăng nhập để xem danh sách yêu thích ❤️'
    });
  }

  const user_id = req.session.authUser.id; // ✅ lấy đúng ID người đăng nhập
  try {
    const list = await watchlistModel.findAllByUser(user_id);
    res.render('vwAccount/watchlist', {
      watchlist: list,
      hasCourses: list.length > 0,
    });
  } catch (err) {
    console.error('❌ Error loading watchlist:', err);
    res.status(500).send('Không thể tải danh sách yêu thích.');
  }
});

export default router;
