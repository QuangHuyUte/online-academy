import express from 'express';
import bcrypt from 'bcryptjs';
import userModel from '../models/user.model.js';
import passport from 'passport';
import { checkAuthenticated } from '../middlewares/auth.mdw.js';
import otpModel, { generateOTP } from '../models/otp.model.js';
import watchlistModel from '../models/watchlist.model.js';
import myCourseModel from "../models/myCourse.model.js";
import instructorModel from '../models/instructor.model.js';
import { verifyEmailExists, sendOTPEmail } from '../services/email.service.js';
import path from 'path'; // 🆕 Thêm path
import fs from 'fs';   // 🆕 Thêm fs
import multer from 'multer'; // 🆕 Thêm multer

// ----------------------------- Helper utils (Cần sao chép từ instructor.route.js) -----------------------------
function slugify(str = '') {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .toLowerCase();
}

// --------------------------------- Multer Configuration ---------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join('public', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = slugify(file.originalname.replace(ext, ''));
    cb(null, `${filename}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Chỉ cho phép định dạng ảnh
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/gif' ||
      file.mimetype === 'image/webp'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP).'), false);
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 5, // Giới hạn 5MB cho ảnh đại diện
  },
});

const router = express.Router();

router.post('/send-otp', async function (req, res) {
    const email = req.body.email;
    
    // 1. Kiểm tra email đã được đăng ký chưa
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
        return res.json({ 
            success: false, 
            message: 'The email is already in use. Please choose another email.' 
        });
    }

    // 2. ✅ THỰC HIỆN KIỂM TRA EMAIL CÓ THẬT KHÔNG NGAY LÚC NÀY
    const isValidEmail = await verifyEmailExists(email);
    if (!isValidEmail) {
        // TRẢ VỀ LỖI RÕ RÀNG NẾU EMAIL KHÔNG TỒN TẠI/DOMAIN LỖI
        return res.json({ 
            success: false, 
            message: 'Email does not exist or cannot receive mail. Please check again.' 
        });
    }
    console.log(isValidEmail);
    // 3. Tạo mã OTP mới
    const otp = generateOTP();
    
    try {
        // Xóa OTP cũ (nếu có)
        await otpModel.deleteOtp(email); 

        // 4. Gửi OTP qua email. 
        // LÚC NÀY, sendOTPEmail KHÔNG NÊN FAIL VÌ VẤN ĐỀ MX/DOMAIN nữa,
        // chỉ fail nếu server mail bị lỗi kết nối/auth.
        const emailSent = await sendOTPEmail(email, otp);
        
        if (!emailSent) {
            // Nếu gửi mail thất bại do lỗi kết nối/auth
            return res.json({ 
                success: false, 
                message: 'Could not send email due to server error. Please try again.' 
            });
        }
        
        // 5. ✅ NẾU GỬI THÀNH CÔNG, LƯU OTP VÀO DATABASE
        await otpModel.add(email, otp);

        // Lưu email đang verify vào session
        req.session.emailToVerify = email;

        // Chỉ hiển thị OTP trong console ở môi trường development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEV] OTP for ${email}: ${otp}`);
        }

        return res.json({ success: true, mock_code: otp }); 

    } catch (error) {
  console.error('Error processing/saving OTP:', error);
        return res.json({ success: false, message: 'Server error during OTP processing.' });
    }
});
router.post('/verify-otp', async function (req, res) {
    const { email, otp } = req.body;
    
    const otpRecord = await otpModel.findByEmailAndOtp(email, otp);
    
    if (!otpRecord) {
    return res.json({ success: false, message: 'OTP is incorrect or has expired.' });
    }

    req.session.verifiedEmail = email;
    
    await otpModel.deleteOtp(email); 

  return res.json({ success: true, message: 'OTP verified successfully.' });
});

router.get('/signup', function (req, res) {
    res.render('vwAccounts/signup');
});

router.get('/is-available', async function (req, res) {
    const email = req.query.email;
    if (!email) {
      return res.json({
          ok: false,
          message: 'Please provide an email.'
        });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
        // Tránh tiết lộ tài khoản không tồn tại, trả về OK nhưng không kiểm tra được.
        // Hoặc trả về ok: true để cho phép tiếp tục kiểm tra mật khẩu.
    return res.json({
      ok: true,
      is_available: true,
      message: 'Email is valid.'
    });
    }

    // Kiểm tra trạng thái is_available. Nếu cột không tồn tại, mặc định là true.
    const is_available = user.is_available === undefined || user.is_available === null ? true : user.is_available;

    if (is_available === false) {
    return res.json({
      ok: false,
      is_available: false,
      message: 'This account has been suspended. Please contact the administrator.'
    });
    }

  return res.json({
    ok: true,
    is_available: true,
    message: 'Account is available.'
  });
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
        message: 'Please verify OTP before signing up.'
      });
    }

    // 🔹 Check email trùng trước khi insert
    const existingUser = await userModel.findByEmail(req.body.email);
    if (existingUser) {
      delete req.session.verifiedEmail;
      return res.render('vwAccounts/signup', {
        error: true,
        message: 'Email already exists.'
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
  console.error('❌ Error adding instructor record:', err);
      }
    }

  delete req.session.verifiedEmail;
  // Use flash to show a success message on the signin page, then redirect
  req.session.flash = { message: 'Sign Up Successfully' };
  return res.redirect('/account/signin');
  } catch (err) {
    console.error('Signup error:', err);
    // 🔹 Nếu trùng email (lỗi UNIQUE constraint)
    if (err.code === '23505') {
      return res.render('vwAccounts/signup', {
        error: true,
        message: 'Email is already in use. Please choose another email.'
      });
    }

    return res.render('vwAccounts/signup', {
      error: true,
      message: 'An error occurred during registration.'
    });
  }
});


router.get('/signin', async function (req, res) {
    res.render('vwAccounts/signin');
});


router.post('/signin', async function (req, res) {
  const { email, password } = req.body;
  const user = await userModel.findByEmail(email);

  // 🆕 Thêm logic kiểm tra is_available vào đây để xử lý đăng nhập trực tiếp (nếu client không dùng AJAX)
  if (user) {
    if (user.is_available === false) { 
      // Nếu tài khoản bị khóa
      return res.render('vwAccounts/signin', { 
        error: true, 
        message: 'This account has been suspended. Please contact the administrator.' 
      });
    }
  }

  if (!user) return res.render('vwAccounts/signin', { error: true, message: 'Incorrect email or password.' });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.render('vwAccounts/signin', { error: true, message: 'Incorrect email or password.' });
  
  const normalized = {
    ...user,
    role: String(user.role || '').toLowerCase().trim(),
  };

  req.session.isAuthenticated = true;
  req.session.authUser = normalized;
  req.session.userId = normalized.id;

  async function getFallbackByRole(u) {
    if (u.role === 'admin') return '/admin/courses';
    if (u.role === 'instructor') return '/instructor';
    return '/';
  }

  const fallback = await getFallbackByRole(normalized);
  const returnUrl = req.session.returnUrl || req.session.url;
  delete req.session.returnUrl;
  delete req.session.url;

  req.session.save(() => res.redirect(returnUrl || fallback));
});



router.post('/signout', function (req, res) {
    // Xóa toàn bộ session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        // Xóa cookie session
        res.clearCookie('connect.sid');
        // Đăng xuất passport nếu đang dùng
        if (req.logout) {
            req.logout((err) => {
                if (err) {
                    console.error('Error logging out passport:', err);
                }
                res.redirect('/');
            });
        } else {
            res.redirect('/');
        }
    });
});

router.get('/profile', checkAuthenticated, function (req, res) {
    res.render('vwAccounts/profile',{
        user: req.session.authUser,
    });
});
/* ------------------------------ Upload endpoint (Cho Avatar) ------------------------------ */
router.post('/upload', checkAuthenticated, upload.single('file'), (req, res) => {
  if (req.file) {
    // Chuẩn hoá đường dẫn về dạng /uploads/...
    let relPath = req.file.path.replace(/^public[\\/]/, '') || '';
    relPath = relPath.split(path.sep).join('/');
    if (!relPath.startsWith('/')) relPath = '/' + relPath;
    return res.json({ url: relPath });
  }

  // Xử lý lỗi từ Multer (ví dụ: kích thước file)
  if (req.uploadError) {
      return res.status(400).json({ success: false, message: req.uploadError });
  }
  
  // Xử lý lỗi chung khi không có file
  return res.status(400).json({ success: false, message: 'No file was uploaded.' });
});

router.post('/profile/send-otp', checkAuthenticated, async function (req, res) {
    const newEmail = req.body.email;
    const currentEmail = req.session.authUser.email;

    // 1. Nếu email không đổi, không làm gì cả
  if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
    return res.json({ 
      success: true, 
      message: 'Email did not change.', 
      skip_otp: true // Báo cho client biết có thể bỏ qua OTP
    });
  }

    // 2. Kiểm tra email mới đã được sử dụng chưa (ngoại trừ user hiện tại)
    const existingUser = await userModel.findByEmail(newEmail);
  if (existingUser && existingUser.id !== req.session.authUser.id) {
    return res.json({ 
      success: false, 
      message: 'The new email is already used by another user.' 
    });
  }

    // 3. Kiểm tra email mới có thật không (format + domain/MX check)
    // Chức năng này dựa trên việc bạn đã triển khai verifyEmailExists trong email.service.js
    const isValidEmail = await verifyEmailExists(newEmail);
  if (!isValidEmail) {
    return res.json({ 
      success: false, 
      message: 'The new email does not exist or cannot receive mail.' 
    });
  }
    
    // 4. Tạo mã OTP mới
    const otp = generateOTP();
    
    try {
        // Xóa OTP cũ cho email mới (nếu có) và thêm OTP mới
        await otpModel.deleteOtp(newEmail); 
        await otpModel.add(newEmail, otp);

        // Gửi OTP qua email
    const emailSent = await sendOTPEmail(newEmail, otp, 'Verify Email for Profile Update'); // Cập nhật tiêu đề email
        if (!emailSent) {
            await otpModel.deleteOtp(newEmail); // Xóa OTP nếu gửi mail thất bại
            return res.json({ 
                success: false, 
        message: 'Could not send email. Please try again later.' 
            });
        }

        // Lưu email mới đang chờ verify vào session
        req.session.emailToVerifyUpdate = newEmail; 

        if (process.env.NODE_ENV === 'development') {
            // Chỉ hiển thị trong môi trường Dev để debug
            console.log(`[DEV] OTP for New Email ${newEmail}: ${otp}`);
        }

        return res.json({ success: true, mock_code: otp }); 

  } catch (error) {
  console.error('Error sending OTP for Profile Update:', error);
    return res.json({ success: false, message: 'Server error while creating OTP.' });
  }
});

router.post('/profile/verify-otp', checkAuthenticated, async function (req, res) {
    const { email, otp } = req.body;
    
    // Đảm bảo email đang verify là email mới trong session
    if (req.session.emailToVerifyUpdate !== email) {
      return res.json({ success: false, message: 'Error: Verification email does not match.' });
    }

    const otpRecord = await otpModel.findByEmailAndOtp(email, otp);
    
  if (!otpRecord) {
    return res.json({ success: false, message: 'OTP is incorrect or has expired.' });
  }

    // Đánh dấu email mới đã được verified
    req.session.verifiedNewEmail = email;
    delete req.session.emailToVerifyUpdate; // Xóa cờ email đang chờ

    await otpModel.deleteOtp(email); 

  return res.json({ success: true, message: 'OTP verified successfully.' });
});

// ----------------------------------------------------------------------------
// 🔄 CẬP NHẬT ROUTE POST /profile
// ----------------------------------------------------------------------------
router.post('/profile', checkAuthenticated, upload.none(), async function (req, res) { 
    
    // 🆕 KIỂM TRA AN TOÀN CHO SESSION USER
  if (!req.session.authUser) {
    req.session.flash = { type: 'warning', message: 'Please sign in again to update your profile.' };
    return res.redirect('/account/signin'); 
  }
    
    const id = req.session.authUser.id;
    
    // ✅ GIỜ ĐÂY req.body.email ĐÃ ĐƯỢC ĐẢM BẢO TỒN TẠI (hoặc là chuỗi rỗng nếu trường không gửi)
    const newEmail = req.body.email || ''; 
    
    // Đảm bảo oldEmail tồn tại
    const oldEmail = req.session.authUser.email; 
    
  if (!oldEmail) {
    // Điều này chỉ xảy ra nếu cấu trúc session bị lỗi nặng
    return res.render('vwAccounts/profile', {
      user: req.session.authUser,
      error: 'Session error: Could not determine old email.'
    });
  }

    const isEmailChanged = newEmail.toLowerCase() !== oldEmail.toLowerCase();
    
    let userUpdate = {
        // Đảm bảo req.body.name tồn tại
        name: req.body.name || req.session.authUser.name,
    };
    
    // 1. Xử lý Email: Chỉ cập nhật email nếu nó không đổi HOẶC đã được verified
    if (isEmailChanged) {
        const verifiedEmail = req.session.verifiedNewEmail;
        if (!verifiedEmail || verifiedEmail.toLowerCase() !== newEmail.toLowerCase()) {
             // Redirect trở lại trang profile với lỗi nếu chưa verified
      return res.render('vwAccounts/profile', {
        user: req.session.authUser,
        error: 'Please verify the new email with OTP before updating.'
      });
        }
        userUpdate.email = newEmail;
        delete req.session.verifiedNewEmail; // Xóa cờ sau khi cập nhật thành công
    } else {
        // Email không đổi
        userUpdate.email = newEmail;
    }
    
    // 2. Cập nhật user (Name, Email)
    await userModel.patch(id, userUpdate);
    req.session.authUser.name = userUpdate.name;
    req.session.authUser.email = userUpdate.email;

    // 3. LOGIC CẬP NHẬT INSTRUCTOR PROFILE (Bio, Avatar)
    if (req.session.authUser.role === 'instructor') {
        const instUpdate = {
            // ✅ req.body.avatar_url được gửi từ trường hiddenAvatarUrl sau khi AJAX thành công
            avatar_url: req.body.avatar_url || null, 
            bio: req.body.bio || null,
        };
        const inst = await instructorModel.findByUserId(id); 
        if (inst) {
            await instructorModel.patch(inst.id, instUpdate);
            req.session.authUser.avatar_url = instUpdate.avatar_url; 
            req.session.authUser.bio = instUpdate.bio;
        }
    }
    
    // Lấy lại user data để đảm bảo các trường khác (như avatar_url/bio) vẫn được truyền lại
    const updatedUser = await userModel.findById(id);
    if (updatedUser && req.session.authUser.role === 'instructor') {
        const instData = await instructorModel.findByUserId(id);
        Object.assign(updatedUser, instData); // merge inst info
    }

    res.render('vwAccounts/profile', {
        user: updatedUser,
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
      message: 'You need to sign in to view your watchlist ❤️'
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
    res.status(500).send('Could not load the watchlist.');
  }
});

// My Courses routes
router.get("/my-courses", async (req, res) => {
  if (!req.session.authUser) {
    return res.redirect("/account/signin");
  }

  // BẮT BUỘC: lấy đúng khóa ID thật đang lưu trong session
  const auth = req.session.authUser;
  const userId = auth?.user_id ?? auth?.id ?? auth?.account_id;

  if (!userId) {
  console.error("❌ userId not found in session:", auth);
    return res.status(400).send("User ID not found in session");
  }

  const myCourses = await myCourseModel.getMyCoursesProgress(userId);

  res.render("vwAccount/my-courses", {
    layout: "main",
    myCourses,
    empty: myCourses.length === 0,
  });
});

// Google Authentication routes
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/account/signin' }),
  async function(req, res) {
    if (req.user) {
      
      if (req.user.is_available === false) {
          
          const errorMessage = 'The linked Google account has been suspended. Please contact the administrator.';
          
          // 1. Set flash message to be shown on the next request
          req.session.flash = { type: 'error', message: errorMessage };
          
          // 2. Clear authentication keys to log out the user safely 
          // (without destroying req.session.flash)
          delete req.session.isAuthenticated;
          delete req.session.authUser;
          delete req.session.userId;
          delete req.session.passport; // Xóa dữ liệu Passport
          
          // 3. Save session and redirect
          return req.session.save((err) => {
              if (err) console.error('Error saving session after block:', err);
              // KHÔNG GỌI res.clearCookie('connect.sid') HOẶC req.session.destroy
              // để giữ session ID và dữ liệu flash.
              res.redirect('/account/signin');
          });
      }

      // Logic đăng nhập thành công (chỉ chạy nếu is_available === true)
      req.session.isAuthenticated = true;
      req.session.authUser = req.user;
    }
    // ✅ Lấy user để suy ra fallback theo role
    const u = req.user || req.session.authUser;
    let fallback = '/';
    if (u?.role === 'admin')        fallback = '/admin/courses';
    else if (u?.role === 'instructor') fallback = '/instructor/my-course';
    else if (u?.role === 'student')    fallback = '/';

    // ✅ Ưu tiên returnUrl nếu có
    const returnUrl = req.session.returnUrl;
    delete req.session.returnUrl;

    res.redirect(returnUrl || fallback);
  }
);

export default router;
