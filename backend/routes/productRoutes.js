const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');

// 1. GET ALL APPROVED PRODUCTS (Pang-Browse Page)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ status: 'Approved' }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) { res.status(500).json({ message: "Error fetching products" }); }
});

// 2. GET MY LISTINGS (Makikita ng user kahit Pending pa)
router.get('/my-listings', protect, async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) { res.status(500).json({ message: "Error fetching your listings" }); }
});

// 3. GET SINGLE PRODUCT (Pang-Product Details Page)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// 4. CREATE PRODUCT (Naka-force sa 'Pending' ang status)
router.post('/', protect, async (req, res) => {
  try {
    const newProduct = await Product.create({ 
      ...req.body, 
      sellerId: req.user._id, 
      sellerName: req.user.name,
      status: 'Pending' 
    });
    res.status(201).json(newProduct);
  } catch (error) { res.status(500).json({ message: "Error creating product" }); }
});

// 5. UPDATE PRODUCT (EDIT)
router.put('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    
    if (product.sellerId.toString() !== req.user._id.toString()) {
       return res.status(401).json({ message: "Not authorized to edit this product" });
    }

    const updatedData = { ...req.body, status: 'Pending' };

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.json(updatedProduct);
  } catch (error) { res.status(500).json({ message: "Error updating product" }); }
});

// 6. DELETE PRODUCT
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.sellerId.toString() !== req.user._id.toString()) {
       return res.status(401).json({ message: "Not authorized to delete this product" });
    }

    await product.deleteOne();
    res.json({ message: "Product deleted successfully" });
  } catch (error) { res.status(500).json({ message: "Error deleting product" }); }
});

module.exports = router;