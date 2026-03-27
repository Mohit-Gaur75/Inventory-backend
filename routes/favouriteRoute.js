const express = require("express");
const router  = express.Router();
const Favourite = require("../models/Favourite");
const Product   = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");
const { createNotification } = require("../utils/notificationHelper");


router.post("/:productId", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const fav = await Favourite.create({
      user:    req.user._id,
      product: req.params.productId,
    });

    if (product.shop?.owner) {
      await createNotification({
        recipientId: product.shop.owner,
        type:    "new_favourite",
        title:   "Product Favourited ❤️",
        message: `Someone added "${product.name}" to their favourites!`,
        link:    "/dashboard",
        metadata: { productId: product._id },
      });
    }

    res.status(201).json({ message: "Added to favourites", fav });
  } catch (err) {
    
    if (err.code === 11000) {
      return res.status(400).json({ message: "Already in favourites" });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.delete("/:productId", protect, async (req, res) => {
  try {
    await Favourite.findOneAndDelete({
      user:    req.user._id,
      product: req.params.productId,
    });
    res.json({ message: "Removed from favourites" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.get("/", protect, async (req, res) => {
  try {
    const favourites = await Favourite.find({ user: req.user._id })
      .populate({
        path: "product",
        populate: { path: "shop", select: "name address location category" },
      });

    const valid = favourites.filter((f) => f.product !== null);
    res.json(valid);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.get("/ids", protect, async (req, res) => {
  try {
    const favourites = await Favourite.find({ user: req.user._id }).select("product");
    const ids = favourites.map((f) => f.product.toString());
    res.json(ids);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;