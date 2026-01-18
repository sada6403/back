require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const employeeRoutes = require('./routes/employees');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Connection
console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => {
        console.error('Could not connect to MongoDB:', err.message);
        console.error('Full Error Code:', err.code);
    });

// Routes
app.use('/api/employees', employeeRoutes);

app.get('/', (req, res) => {
    res.send('Management IT Backend is Running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
