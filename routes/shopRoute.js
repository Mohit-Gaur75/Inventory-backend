const express = require("express");
const router = express.Router();
const Shop = require("../models/Shop");
const Product = require("../models/Product");
const { protect, authorize } = require("../middleware/authMiddleware");


router.post("/", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const { name, description, category, address, latitude, longitude, phone, email } = req.body;

    
    const existingShop = await Shop.findOne({ owner: req.user._id });
    if (existingShop) {
      return res.status(400).json({ message: "You already have a shop. Update it instead." });
    }

    const shop = await Shop.create({
      owner: req.user._id,
      name,
      description,
      category,
      address,
      phone,
      email,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)], 
      },
    });

    res.status(201).json(shop);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.get("/my", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      return res.status(404).json({ message: "No shop found. Please create one." });
    }
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.put("/:id", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) return res.status(404).json({ message: "Shop not found" });

    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this shop" });
    }

    const { name, description, category, address, latitude, longitude, phone, email } = req.body;

    if (name) shop.name = name;
    if (description) shop.description = description;
    if (category) shop.category = category;
    if (address) shop.address = address;
    if (phone) shop.phone = phone;
    if (email) shop.email = email;
    if (latitude && longitude) {
      shop.location = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    const updatedShop = await shop.save();
    res.json(updatedShop);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate("owner", "name email");
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    
    const products = await Product.find({ shop: shop._id, isAvailable: true });

    res.json({ shop, products });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.get("/", async (req, res) => {
  try {
    const shops = await Shop.find({ isActive: true }).populate("owner", "name");
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;