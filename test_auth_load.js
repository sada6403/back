try {
    console.log('Loading authRoutes...');
    require('./routes/authRoutes');
    console.log('Routes Loaded OK');
} catch (e) {
    console.error('CRASH:', e);
}
