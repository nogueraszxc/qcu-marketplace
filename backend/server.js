const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- IMPORT ROUTES ---
const userRoutes = require('./routes/userRoutes'); 
const productRoutes = require('./routes/productRoutes'); 
const transactionRoutes = require('./routes/transactionRoutes'); 
const adminRoutes = require('./routes/adminRoutes'); 
const reportRoutes = require('./routes/reportRoutes'); // <-- IDINAGDAG ANG REPORTS ROUTE

const app = express();

// --- MIDDLEWARES ---
app.use(cors()); 

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- MONGODB CONNECTION ---
const dbURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/qcu_marketplace';

mongoose.connect(dbURI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch((err) => console.log('❌ MongoDB Connection Error:', err));


// --- API ROUTES ---
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes); 
app.use('/api/transactions', transactionRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/reports', reportRoutes); // <-- MOUNTED NA ANG REPORTS API


// --- SERVER TEST ROUTE ---
app.get('/', (req, res) => {
  res.send('QCU Marketplace Backend is running perfectly! 🚀');
});


// --- SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 Ready to receive data from frontend...`);
});