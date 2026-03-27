const express = require("express");
const router  = express.Router();
const Review  = require("../models/Review");
const Shop    = require("../models/Shop");
const { protect } = require("../middleware/authMiddleware");
const { createNotification } = require("../utils/notificationHelper");


router.post("/:shopId", protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const shop = await Shop.findById(req.params.shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const review = await Review.findOneAndUpdate(
      { user: req.user._id, shop: req.params.shopId },
      { rating, comment },
      { upsert: true, new: true, runValidators: true }
    ).populate("user", "name");

    await createNotification({
      recipientId: shop.owner,
      type:    "new_review",
      title:   "New Review Received ⭐",
      message: `${req.user.name} gave your shop "${shop.name}" a ${rating}-star review.`,
      link:    `/shop/${shop._id}`,
      metadata: { shopId: shop._id, reviewId: review._id, rating },
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/:shopId", async (req, res) => {
  try {
    const reviews = await Review.find({ shop: req.params.shopId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => distribution[r.rating]++);

    res.json({ reviews, avgRating: parseFloat(avgRating), totalReviews: reviews.length, distribution });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.delete("/:shopId", protect, async (req, res) => {
  try {
    await Review.findOneAndDelete({
      user: req.user._id,
      shop: req.params.shopId,
    });
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;