try {
    process.env.PORT = 3000;
    process.env.MONGODB_URI = 'mongodb+srv://cst23071_db_user:vgquPlo0tLETMjvK@cluster0.s8fljgu.mongodb.net/nf-farming?retryWrites=true&w=majority';
    process.env.DB_PREFERENCE = 'atlas';
    process.env.JWT_SECRET = 'nf_farming_secure_jwt_secret_key_2023_!@#';

    const express = require('express');
    const mongoose = require('mongoose');
    const cors = require('cors');
    console.log('Loading authRoutes...');
    const authRoutes = require('./routes/authRoutes');
    console.log('Success');
} catch (e) {
    console.error('CRASH:', e);
}
