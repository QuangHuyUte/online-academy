import db from '../utils/db.js';

export default {
    
    findByEmail(email) {
        return db('users').where('email', email).first();
    },
    add(user) {
        return db('users').insert(user);
    },
    getAllUsers() {
        return db('users');
    },
    findById(id) {
        return db('users').where('id', id).first();
    },
    getpasswordHash(name) {
        return db('users').where('name', name).select('password_hash').first();
    },
    patch(id,user) {
        return db('users').where('id', id).update(user);
    }
    
}