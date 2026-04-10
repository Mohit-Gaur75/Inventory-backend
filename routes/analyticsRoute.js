const express          = require("express");
const router           = express.Router();
const Product          = require("../models/Product");
const ProductAnalytics = require("../models/ProductAnalytics");
const { protect, authorize } = require("../middleware/authMiddleware");

const getOrCreate = async (productId, shopId) => {
  let doc = await ProductAnalytics.findOne({ product: productId });
  if (!doc) {
    doc = await ProductAnalytics.create({ product: productId, shop: shopId });
  }
  return doc;
};

router.post("/view/:productId", async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).select("shop");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const doc = await getOrCreate(req.params.productId, product.shop);

    doc.views += 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEntry = doc.viewHistory.find(
      (v) => v.date.getTime() === today.getTime()
    );
    if (todayEntry) {
      todayEntry.count += 1;
    } else {
      doc.viewHistory.push({ date: today, count: 1 });
     
      if (doc.viewHistory.length > 90) {
        doc.viewHistory = doc.viewHistory.slice(-90);
      }
    }

    await doc.save();
    res.json({ views: doc.views });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/cart-add/:productId", async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).select("shop");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const doc = await getOrCreate(req.params.productId, product.shop);
    doc.cartAdds += 1;
    await doc.save();
    res.json({ cartAdds: doc.cartAdds });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/favourite/:productId", async (req, res) => {
  try {
    const { delta } = req.body; // +1 or -1
    const product = await Product.findById(req.params.productId).select("shop");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const doc = await getOrCreate(req.params.productId, product.shop);
    doc.favouriteCount = Math.max(0, doc.favouriteCount + (delta === -1 ? -1 : 1));
    await doc.save();
    res.json({ favouriteCount: doc.favouriteCount });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/stock-update/:productId", protect, async (req, res) => {
  try {
    const { newStock, oldStock, reason = "manual" } = req.body;
    const product = await Product.findById(req.params.productId).select("shop");
    if (!product) return res.status(404).json({ message: "Product not found" });

    const doc = await getOrCreate(req.params.productId, product.shop);
    doc.stockHistory.push({
      date:   new Date(),
      stock:  newStock,
      delta:  newStock - oldStock,
      reason,
    });
    if (doc.stockHistory.length > 60) {
      doc.stockHistory = doc.stockHistory.slice(-60);
    }
    await doc.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
router.get("/product/:productId", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).select("owner shop name price priceHistory");
    if (!product)
      return res.status(404).json({ message: "Product not found" });
    if (product.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    let doc = await ProductAnalytics.findOne({ product: product._id });
    if (!doc) {
      doc = { views: 0, cartAdds: 0, cartRemoves: 0, favouriteCount: 0, viewHistory: [], stockHistory: [] };
    }

    const conversionRate = doc.views > 0
      ? ((doc.cartAdds / doc.views) * 100).toFixed(1)
      : "0.0";

    res.json({
      product: {
        _id:          product._id,
        name:         product.name,
        currentPrice: product.price,
        priceHistory: product.priceHistory || [],
      },
      views:          doc.views,
      cartAdds:       doc.cartAdds,
      favouriteCount: doc.favouriteCount,
      conversionRate: parseFloat(conversionRate),
      viewHistory:    doc.viewHistory,
      stockHistory:   doc.stockHistory,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/shop", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const products = await Product.find({ owner: req.user._id }).select("name price stock isAvailable");
    const productIds = products.map((p) => p._id);

    const analytics = await ProductAnalytics.find({ product: { $in: productIds } });

    const analyticsMap = {};
    analytics.forEach((a) => { analyticsMap[a.product.toString()] = a; });

    const summary = products.map((p) => {
      const a = analyticsMap[p._id.toString()] || {};
      const views    = a.views    || 0;
      const cartAdds = a.cartAdds || 0;
      return {
        _id:            p._id,
        name:           p.name,
        price:          p.price,
        stock:          p.stock,
        isAvailable:    p.isAvailable,
        views,
        cartAdds,
        favouriteCount: a.favouriteCount || 0,
        conversionRate: views > 0 ? parseFloat(((cartAdds / views) * 100).toFixed(1)) : 0,
      };
    });

    summary.sort((a, b) => b.views - a.views);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/compare", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const ids = (req.query.ids || "").split(",").filter(Boolean).slice(0, 4);
    if (ids.length < 2)
      return res.status(400).json({ message: "Provide at least 2 product IDs" });

    const products  = await Product.find({ _id: { $in: ids }, owner: req.user._id })
      .select("name price stock");
    const analytics = await ProductAnalytics.find({ product: { $in: ids } });
    const aMap = {};
    analytics.forEach((a) => { aMap[a.product.toString()] = a; });

    const result = products.map((p) => {
      const a = aMap[p._id.toString()] || {};
      const views    = a.views    || 0;
      const cartAdds = a.cartAdds || 0;
      return {
        _id:            p._id,
        name:           p.name,
        price:          p.price,
        stock:          p.stock,
        views,
        cartAdds,
        favouriteCount: a.favouriteCount || 0,
        conversionRate: views > 0 ? parseFloat(((cartAdds / views) * 100).toFixed(1)) : 0,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
