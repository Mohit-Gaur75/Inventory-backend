const express = require("express");
const router  = express.Router();
const Product = require("../models/Product");
const Shop    = require("../models/Shop");
const { protect, authorize } = require("../middleware/authMiddleware");
const { createNotification } = require("../utils/notificationHelper");
const ProductAnalytics = require("../models/ProductAnalytics");

const LOW_STOCK_THRESHOLD = 5;

router.post("/", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop)
      return res.status(404).json({ message: "Create a shop first" });

    const { name, description, category, price, stock, unit, image } = req.body;

    const product = await Product.create({
      shop: shop._id, owner: req.user._id,
      name, description, category,
      price: parseFloat(price),
      stock: parseInt(stock),
      unit, image,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`shop:${shop._id}`).emit("stock:updated", {
        productId: product._id,
        stock:     product.stock,
        price:     product.price,
        shopId:    shop._id,
      });
    }

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/my", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const products = await Product.find({ owner: req.user._id })
      .populate("shop", "name");
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/:id", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    const prevStock = product.stock;
    const prevPrice = product.price;

    const { name, description, category, price, stock, unit, image } = req.body;
    if (name)             product.name        = name;
    if (description)      product.description = description;
    if (category)         product.category    = category;
    if (price !== undefined) product.price   = parseFloat(price);
    if (stock !== undefined) product.stock   = parseInt(stock);
    if (unit)             product.unit        = unit;
    if (image)            product.image       = image;

    const updated = await product.save();

    if (stock !== undefined) {
      const newStock = parseInt(stock);

      if (newStock === 0 && prevStock > 0) {
        await createNotification({
          recipientId: req.user._id,
          type:    "out_of_stock",
          title:   "Product Out of Stock 🚫",
          message: `"${product.name}" is now out of stock. Update the stock to keep selling.`,
          link:    "/dashboard",
          metadata: { productId: product._id },
        });
      } else if (newStock > 0 && newStock <= LOW_STOCK_THRESHOLD && prevStock > LOW_STOCK_THRESHOLD) {
        await createNotification({
          recipientId: req.user._id,
          type:    "low_stock",
          title:   "Low Stock Warning ⚠️",
          message: `"${product.name}" has only ${newStock} units left. Consider restocking soon.`,
          link:    "/dashboard",
          metadata: { productId: product._id, stock: newStock },
        });
      }

      await ProductAnalytics.findOneAndUpdate(
        { product: product._id },
        {
          $push: {
            stockHistory: {
              $each: [{
                date:   new Date(),
                stock:  newStock,
                delta:  newStock - prevStock,
                reason: "manual",
              }],
              $slice: -60,
            },
          },
          $setOnInsert: { shop: product.shop },
        },
        { upsert: true }
      );
    }

    const io = req.app.get("io");
    if (io) {
      const shopId = product.shop.toString();

      if (stock !== undefined) {
        const payload = {
          productId:   product._id,
          name:        product.name,
          stock:       product.stock,
          isAvailable: product.isAvailable,
          shopId,
        };
        io.to(`shop:${shopId}`).emit("stock:updated", payload);
        io.emit("stock:updated", payload);          
      }

      if (price !== undefined && parseFloat(price) !== prevPrice) {
        const pricePayload = {
          productId: product._id,
          name:      product.name,
          price:     product.price,
          shopId,
        };
        io.to(`shop:${shopId}`).emit("price:updated", pricePayload);
        io.emit("price:updated", pricePayload);
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
router.delete("/:id", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    const shopId = product.shop.toString();
    await product.deleteOne();

    const io = req.app.get("io");
    if (io) {
      io.to(`shop:${shopId}`).emit("product:deleted", { productId: req.params.id, shopId });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("shop", "name address location");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
