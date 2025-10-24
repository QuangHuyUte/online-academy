import express from 'express';
import bcrypt from 'bcryptjs';
import userModel from '../models/user.model.js';
import { checkAuthenticated } from '../middlewares/auth.mdw.js';

const router = express.Router();

router.get('/signup', function (req, res) {
    res.render('vwAccounts/signup');
});

router.post('/signup', async function (req, res) {
    const hash  = bcrypt.hashSync(req.body.password, 10);
    const user = {
        name: req.body.name,
        password_hash: hash,
        role: req.body.role,
        email: req.body.email,
        created_at: new Date(),
    };

    await userModel.add(user);
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
