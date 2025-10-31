import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail', // hoặc SMTP config của bạn
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // App Password từ Google Account
    }
});

// Danh sách các domain email phổ biến và đáng tin cậy (dùng cho heuristic nhanh)
const TRUSTED_TOP_PROVIDERS = new Set([
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'aol.com',
    'icloud.com',
    'protonmail.com',
    'zoho.com'
]);

// Danh sách domain tạm/ disposable nên chặn ngay lập tức
const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', '10minutemail.com', 'tempmail.com', 'trashmail.com', 'guerrillamail.com',
    'tempmail.net', 'yopmail.com', 'maildrop.cc'
]);

// Simple in-memory cache for DNS/MX and mailbox checks to speed up repeated lookups
const cache = new Map(); // key -> { value, expiresAt }
function cacheSet(key, value, ttlMs = 1000 * 60 * 5) { // default 5 minutes
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
function cacheGet(key) {
    const e = cache.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) {
        cache.delete(key);
        return null;
    }
    return e.value;
}

/**
 * Kiểm tra cú pháp email có hợp lệ không
 * @param {string} email - Email cần kiểm tra
 * @returns {boolean} - true nếu cú pháp email hợp lệ
 */
function isValidEmailFormat(email) {
    // RFC 5322 Official Standard Email Regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
}

/**
 * Kiểm tra email có tồn tại không
 * @param {string} email - Email cần kiểm tra
 * @returns {Promise<boolean>} - true nếu email hợp lệ
 */
export async function verifyEmailExists(email) {
    try {
        // 1. Kiểm tra cú pháp email nhanh (giữ nguyên)
        if (!isValidEmailFormat(email)) {
            return false;
        }

        const [localPart, domainRaw] = email.split('@');
        const domain = (domainRaw || '').toLowerCase();
        if (!localPart || !domain) return false;

        // 2. Chặn nhanh domain disposable (giữ nguyên)
        if (DISPOSABLE_DOMAINS.has(domain)) return false;

        // 3. Kiểm tra cache MX (giữ nguyên)
        const cacheKey = `mx:${domain}`;
        const cached = cacheGet(cacheKey);
        if (cached !== null) return cached;

        const { promises: dns } = await import('dns');
        
        // DNS lookup với timeout
        const mxLookup = dns.resolveMx(domain);
        const timeoutMs = 1500; // 1.5s fast timeout for UX
        
        const mxRecords = await Promise.race([
            mxLookup,
            new Promise((_, rej) => setTimeout(() => rej(new Error('dns-timeout')), timeoutMs))
        ]).catch((err) => {
            // ❌ CHỈNH SỬA TẠI ĐÂY ❌
            // Nếu DNS times out (ví dụ, mạng chậm), ta chỉ chấp nhận nó OK nếu là Trusted provider
            if (err.message === 'dns-timeout' && TRUSTED_TOP_PROVIDERS.has(domain)) {
                cacheSet(cacheKey, true, 1000 * 60 * 60); // cache 1h
                return true; // Tạm thời chấp nhận (dành cho các miền lớn)
            }
            
            // Nếu lỗi khác (ví dụ: ENOTFOUND) hoặc timeout trên miền không đáng tin, chặn.
            console.error('DNS MX lookup failed/timeout for domain:', domain, err && err.message);
            cacheSet(cacheKey, false, 1000 * 60); // cache negative 1min
            return false;
        });

        // Nếu mxRecords là true (từ Trusted fallback), trả về true (giữ nguyên)
        if (mxRecords === true) return true;

        // 4. Nếu DNS lookup hoàn tất thành công
        const ok = Array.isArray(mxRecords) && mxRecords.length > 0;
        cacheSet(cacheKey, ok, ok ? 1000 * 60 * 60 : 1000 * 60);
        return ok;

    } catch (error) {
        // Nếu lỗi xảy ra ngoài khối Promise.race (ví dụ: email.split('@') lỗi, không phải DNS timeout)
        console.error('Error verifying email:', error);
        return false;
    }
}

/**
 * Gửi email chứa mã OTP
 * @param {string} to - Email người nhận
 * @param {string} otp - Mã OTP
 * @returns {Promise<boolean>} - true nếu gửi thành công
 */
export async function sendOTPEmail(to, otp) {
    try {
        
        // Template email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: 'Your OTP Code for Online Academy',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Online Academy Registration</h2>
                    <p>Hello,</p>
                    <p>Your OTP code for registration is:</p>
                    <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message, please do not reply.
                    </p>
                </div>
            `
        };

        // Gửi email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

/**
 * Thử kiểm tra mailbox bằng cách kết nối tới MX server và gửi RCPT TO
 * NOTE: phương pháp này không hoàn toàn chính xác do cách các server mail cấu hình
 * (nhiều server luôn trả 250 để tránh harvesting). Dùng làm lớp bảo vệ bổ sung.
 * @param {string} email
 * @param {{timeout?: number}} opts
 * @returns {Promise<boolean>}
 */
export async function verifyMailbox(email, opts = {}) {
    const timeout = opts.timeout || 5000;
    try {
        const [local, domain] = email.split('@');
        if (!local || !domain) return false;

        const { promises: dns } = await import('dns');
        const mxs = await dns.resolveMx(domain);
        if (!mxs || mxs.length === 0) return false;

        // Sort theo priority
        mxs.sort((a, b) => a.priority - b.priority);

        const net = await import('net');

        // Try each MX until one accepts or we run out
        for (const mx of mxs) {
            const host = mx.exchange;
            let socket;
            try {
                await new Promise((resolve, reject) => {
                    let response = '';
                    let stage = 0; // 0=greet,1=ehlo,2=mailfrom,3=rcpt
                    socket = net.createConnection(25, host);
                    const timer = setTimeout(() => {
                        socket.destroy();
                        reject(new Error('timeout'));
                    }, timeout);

                    socket.on('error', (err) => {
                        clearTimeout(timer);
                        reject(err);
                    });

                    socket.on('data', (chunk) => {
                        response += chunk.toString();
                        // We look for a 220 on greet, 250 after commands, or 5xx for rejection
                        if (stage === 0 && /\n220/.test(response)) {
                            socket.write(`EHLO localhost\r\n`);
                            stage = 1;
                            response = '';
                            return;
                        }
                        if (stage === 1 && /\n250/.test(response)) {
                            socket.write(`MAIL FROM:<>
\n`);
                            stage = 2;
                            response = '';
                            return;
                        }
                        if (stage === 2 && /\n250/.test(response)) {
                            socket.write(`RCPT TO:<${email}>\r\n`);
                            stage = 3;
                            response = '';
                            return;
                        }
                        if (stage === 3) {
                            // If server responds 250/251 -> accepted; 550/553 -> rejected
                            if (/\n250/.test(response) || /\n251/.test(response)) {
                                socket.write('QUIT\r\n');
                                clearTimeout(timer);
                                socket.end();
                                resolve(true);
                            } else if (/\n5\d\d/.test(response) || /\n4\d\d/.test(response)) {
                                clearTimeout(timer);
                                socket.end();
                                reject(new Error('rcpt-rejected'));
                            }
                        }
                    });

                    socket.on('end', () => {
                        clearTimeout(timer);
                        // If we reached end without explicit acceptance, reject this MX
                        reject(new Error('connection-ended'));
                    });
                });

                // If resolved true, mailbox accepted
                return true;
            } catch (err) {
                // try next MX
                try {
                    if (socket && !socket.destroyed) socket.destroy();
                } catch (e) {}
                continue;
            }
        }

        return false;
    } catch (err) {
        console.error('verifyMailbox error:', err && err.message ? err.message : err);
        return false;
    }
}