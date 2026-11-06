const express = require("express");
const router  = express.Router();
const Shop    = require("../models/Shop");
const Product = require("../models/Product");
const { protect, authorize } = require("../middleware/authMiddleware");
const { getCache, setCache, delCache, delPattern } = require("../config/redis");

const invalidateShopCaches = (shopId) => {
  if (shopId) delCache(`shop:${shopId}`).catch(() => {});
  delPattern("search:*").catch(() => {});
  delPattern("nearby:*").catch(() => {});
};

router.post("/", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const { name, description, category, address, latitude, longitude, phone, email } = req.body;
    const existingShop = await Shop.findOne({ owner: req.user._id });
    if (existingShop)
      return res.status(400).json({ message: "You already have a shop. Update it instead." });

    const shop = await Shop.create({
      owner: req.user._id,
      name, description, category, address, phone, email,
      location: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
    });

    invalidateShopCaches(shop._id);
    res.status(201).json(shop);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/my", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: "No shop found. Please create one." });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    if (shop.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized to update this shop" });

    const { name, description, category, address, latitude, longitude, phone, email } = req.body;
    if (name)        shop.name        = name;
    if (description) shop.description = description;
    if (category)    shop.category    = category;
    if (address)     shop.address     = address;
    if (phone)       shop.phone       = phone;
    if (email)       shop.email       = email;
    if (latitude && longitude)
      shop.location = { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] };

    const updatedShop = await shop.save();
    invalidateShopCaches(shop._id);
    res.json(updatedShop);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const cacheKey = `shop:${req.params.id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const shop = await Shop.findById(req.params.id).populate("owner", "name email");
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    const products = await Product.find({ shop: shop._id, isAvailable: true });

    const payload = { shop, products };
    await setCache(cacheKey, payload, 180); // 3 min TTL
    res.setHeader("X-Cache", "MISS");
    res.json(payload);
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

router.put("/:id/toggle-open", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    if (shop.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    shop.isOpen = !shop.isOpen;
    await shop.save();

    invalidateShopCaches(shop._id);

    const io = req.app.get("io");
    if (io) io.emit("shop:statusChanged", { shopId: shop._id, isOpen: shop.isOpen, computedIsOpen: shop.computedIsOpen });

    res.json({ isOpen: shop.isOpen, computedIsOpen: shop.computedIsOpen });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id/business-hours", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    if (shop.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    const { businessHours } = req.body;
    if (!Array.isArray(businessHours) || businessHours.length !== 7)
      return res.status(400).json({ message: "businessHours must be array of 7 days" });

    shop.businessHours = businessHours;
    await shop.save();

    invalidateShopCaches(shop._id);
    res.json({ businessHours: shop.businessHours, computedIsOpen: shop.computedIsOpen });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id/holidays", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    if (shop.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    const { holidays } = req.body;
    if (!Array.isArray(holidays))
      return res.status(400).json({ message: "holidays must be an array of date strings" });

    shop.holidays = holidays;
    await shop.save();

    invalidateShopCaches(shop._id);
    res.json({ holidays: shop.holidays });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
