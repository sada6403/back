try {
    require('express');
    console.log('express OK');
    require('mongoose');
    console.log('mongoose OK');
    require('cors');
    console.log('cors OK');
    require('bcryptjs');
    console.log('bcryptjs OK');
    require('jsonwebtoken');
    console.log('jsonwebtoken OK');
    require('dotenv');
    console.log('dotenv OK');
} catch (e) {
    console.error('MISSING DEP:', e.message);
    process.exit(1);
}
