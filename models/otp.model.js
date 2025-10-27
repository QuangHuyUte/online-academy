// otp.model.js
import db from '../utils/db.js';
export default {
    /**
     * Thêm mã OTP mới cho email.
     * @param {string} email 
     * @param {string} otp - 
     */
    add(email, otp) {
       
            return db('email_otps').insert({
                email: email,
                otp: otp,
                
                expires_at: db.raw("now() + interval '10 minutes'") 
            });
    },

    /**
     * Tìm mã OTP còn hiệu lực theo email và mã.
     * @param {string} email
     * @param {string} otp
     */
    findByEmailAndOtp(email, otp) {
        return db('email_otps')
            .where({
                email: email,
                otp: otp
            })
            // Kiểm tra xem OTP còn hiệu lực không
            .where('expires_at', '>', db.raw('now()')) 
            .first();
    },

    /**
     * Xóa mã OTP sau khi xác nhận thành công.
     * @param {string} email
     */
    deleteOtp(email) {
        return db('email_otps').where('email', email).del();
    }
}

// Hàm tiện ích tạo OTP ngẫu nhiên
export function generateOTP() {
    // Tạo mã OTP 6 chữ số ngẫu nhiên
    return Math.floor(100000 + Math.random() * 900000).toString();
}