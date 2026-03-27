const express = require("express");
const router  = express.Router();
const mongoose = require("mongoose");
const { isAdmin } = require("../middleware/authMiddleware");
const User    = require("../models/User");
const Shop    = require("../models/Shop");
const Product = require("../models/Product");
const Review  = require("../models/Review");
const { createNotification } = require("../utils/notificationHelper");


router.get("/stats", isAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalShopkeepers,
      totalShops,
      activeShops,
      totalProducts,
      availableProducts,
      totalReviews,
      bannedUsers,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "shopkeeper" }),
      Shop.countDocuments(),
      Shop.countDocuments({ isActive: true }),
      Product.countDocuments(),
      Product.countDocuments({ isAvailable: true }),
      Review.countDocuments(),
      User.countDocuments({ isBanned: true }),
    ]);

    
    const recentUsers = await User.find({ role: { $ne: "admin" } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role createdAt");

  
    const recentShops = await Shop.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("owner", "name email")
      .select("name category createdAt owner");

 
    const topShops = await Product.aggregate([
      { $group: { _id: "$shop", productCount: { $sum: 1 } } },
      { $sort: { productCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "shops",
          localField: "_id",
          foreignField: "_id",
          as: "shop",
        },
      },
      { $unwind: "$shop" },
      { $project: { productCount: 1, "shop.name": 1, "shop.category": 1 } },
    ]);

  
    const categoryBreakdown = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      users: { total: totalUsers, customers: totalCustomers, shopkeepers: totalShopkeepers, banned: bannedUsers },
      shops: { total: totalShops, active: activeShops, inactive: totalShops - activeShops },
      products: { total: totalProducts, available: availableProducts, outOfStock: totalProducts - availableProducts },
      reviews: { total: totalReviews },
      recentUsers,
      recentShops,
      topShops,
      categoryBreakdown,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// USER MANAGEMENT

router.get("/users", isAdmin, async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    const filter = { role: { $ne: "admin" } };

    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role && role !== "all") filter.role = role;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-password");

    res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/users/:id/ban", isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(400).json({ message: "Cannot ban an admin" });

    user.isBanned = !user.isBanned;
    await user.save();

    res.json({
      message: user.isBanned ? "User banned successfully" : "User unbanned successfully",
      isBanned: user.isBanned,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/users/:id", isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(400).json({ message: "Cannot delete an admin" });

    if (user.role === "shopkeeper") {
      const shop = await Shop.findOne({ owner: user._id });
      if (shop) {
        await Product.deleteMany({ shop: shop._id });
        await shop.deleteOne();
      }
    }

    await user.deleteOne();
    res.json({ message: "User and associated data deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// SHOP MANAGEMENT

router.get("/shops", isAdmin, async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
      ];
    }
    if (category && category !== "all") filter.category = category;

    const total = await Shop.countDocuments(filter);
    const shops = await Shop.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("owner", "name email");

    const shopsWithCount = await Promise.all(
      shops.map(async (shop) => {
        const productCount = await Product.countDocuments({ shop: shop._id });
        return { ...shop.toObject(), productCount };
      })
    );

    res.json({ shops: shopsWithCount, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/shops/:id/toggle", isAdmin, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    shop.isActive = !shop.isActive;
    await shop.save();

    await createNotification({
  recipientId: shop.owner,
  type:    shop.isActive ? "shop_activated" : "shop_deactivated",
  title:   shop.isActive ? "Shop Activated ✅" : "Shop Deactivated ❌",
  message: shop.isActive
    ? `Your shop "${shop.name}" has been activated by admin. Customers can now find you!`
    : `Your shop "${shop.name}" has been deactivated by admin. Contact support for help.`,
  link: "/dashboard",
  metadata: { shopId: shop._id },
});

    res.json({
      message: shop.isActive ? "Shop activated" : "Shop deactivated",
      isActive: shop.isActive,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/shops/:id", isAdmin, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    await Product.deleteMany({ shop: shop._id });
    await shop.deleteOne();

    res.json({ message: "Shop and all its products deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

//  PRODUCT MANAGEMENT

router.get("/products", isAdmin, async (req, res) => {
  try {
    const { search, category, available, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search)    filter.name = { $regex: search, $options: "i" };
    if (category && category !== "all") filter.category = category;
    if (available === "true")  filter.isAvailable = true;
    if (available === "false") filter.isAvailable = false;

    const total    = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("shop", "name")
      .populate("owner", "name");

    res.json({ products, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/products/:id", isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    await product.deleteOne();
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// REVIEW MANAGEMENT

router.get("/reviews", isAdmin, async (req, res) => {
  try {
    const { rating, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (rating && rating !== "all") filter.rating = parseInt(rating);

    const total   = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "name email")
      .populate("shop", "name");

    res.json({ reviews, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/reviews/:id", isAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    await review.deleteOne();
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;