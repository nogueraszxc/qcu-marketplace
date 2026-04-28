const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- IMPORT ROUTES ---
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// --- MIDDLEWARES ---
// In-update natin ang CORS para tanggapin ang request galing sa Vercel at iba pang origins
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- MONGODB CONNECTION ---
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB Connected Successfully!'))
    .catch((err) => console.log('❌ MongoDB Connection Error:', err));

// --- API ROUTES ---
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

// --- HEALTH CHECK ROUTE ---
// Ito ay para malaman natin kung gising na ang Render server
app.get('/', (req, res) => {
    res.send('QCU Marketplace API is running...');
});

// --- SERVER PORT ---
// Importante: Gamitin ang process.env.PORT para kay Render
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});