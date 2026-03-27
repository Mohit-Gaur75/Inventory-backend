const express = require("express");
const router  = express.Router();
const Cart    = require("../models/Cart");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");


const getPopulatedCart = (userId) =>
  Cart.findOne({ user: userId }).populate({
    path: "items.product",
    populate: { path: "shop", select: "name address phone location" },
  });


router.get("/", protect, async (req, res) => {
  try {
    const cart = await getPopulatedCart(req.user._id);
    if (!cart) return res.json({ items: [], total: 0 });

    const total = cart.items.reduce(
      (sum, item) => sum + (item.product?.price || 0) * item.quantity, 0
    );
    res.json({ items: cart.items, total });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.post("/add", protect, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!product.isAvailable) return res.status(400).json({ message: "Product is out of stock" });

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      
      cart = await Cart.create({
        user: req.user._id,
        items: [{ product: productId, shop: product.shop, quantity }],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ product: productId, shop: product.shop, quantity });
      }
      await cart.save();
    }

    const populated = await getPopulatedCart(req.user._id);
    const total = populated.items.reduce(
      (sum, item) => sum + (item.product?.price || 0) * item.quantity, 0
    );

    res.json({ message: "Added to cart", items: populated.items, total });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/update", protect, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) return res.status(404).json({ message: "Item not in cart" });

    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.product.toString() !== productId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    const populated = await getPopulatedCart(req.user._id);
    const total = populated.items.reduce(
      (sum, item) => sum + (item.product?.price || 0) * item.quantity, 0
    );

    res.json({ items: populated.items, total });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/remove/:productId", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (i) => i.product.toString() !== req.params.productId
    );
    await cart.save();

    const populated = await getPopulatedCart(req.user._id);
    const total = populated.items.reduce(
      (sum, item) => sum + (item.product?.price || 0) * item.quantity, 0
    );

    res.json({ message: "Removed from cart", items: populated.items, total });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/clear", protect, async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [] }
    );
    res.json({ message: "Cart cleared", items: [], total: 0 });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;