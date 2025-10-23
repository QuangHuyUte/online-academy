import express from 'express';
import bcrypt from 'bcryptjs';
import userModel from '../models/user.models.js';


const router = express.Router();

router.get('/signup', function (req, res) {
    res.render('vwAccounts/signup');
});

router.post('/signup', async function (req, res) {
});

