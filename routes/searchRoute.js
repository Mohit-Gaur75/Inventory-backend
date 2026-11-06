const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Shop = require("../models/Shop");
const { getCache, setCache } = require("../config/redis");

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

router.get("/autocomplete", async (req, res) => {
  try {
    const { q } = req.query;
    const cleanQ = q ? q.trim().toLowerCase() : "";
    const cacheKey = `autocomplete:${cleanQ || "__trending__"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    if (!cleanQ) {
      const trending = await Product.find({ isAvailable: true, stock: { $gt: 0 } })
        .populate({ path: "shop", select: "name address location category phone isActive" })
        .sort({ stock: -1, createdAt: -1 })
        .limit(10)
        .lean();

      const activeOnly = trending.filter(p => p.shop && p.shop.isActive !== false);
      const seen = new Set();
      const deduped = activeOnly.filter((p) => {
        const key = p.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const result = { suggestions: [], trending: deduped.slice(0, 8) };
      await setCache(cacheKey, result, 300); // 5 min TTL
      res.setHeader("X-Cache", "MISS");
      return res.json(result);
    }

    const suggestions = await Product.find({
      name: { $regex: cleanQ, $options: "i" },
      isAvailable: true,
      stock: { $gt: 0 },
    })
      .populate({ path: "shop", select: "name address location category phone isActive" })
      .sort({ name: 1 })
      .limit(12)
      .lean();

    const activeOnly = suggestions.filter(p => p.shop && p.shop.isActive !== false);
    const seen = new Set();
    const deduped = activeOnly.filter((p) => {
      const key = p.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const result = { suggestions: deduped.slice(0, 8), trending: [] };
    await setCache(cacheKey, result, 300); // 5 min TTL
    res.setHeader("X-Cache", "MISS");
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Autocomplete error", error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const {
      q, category, lat, lng, sortBy,
      maxDistance, minPrice, maxPrice,
      inStockOnly, page = 1, limit = 12,
    } = req.query;

    const cacheKey = `search:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    // Filter strictly for products available currently
    const filter = { isAvailable: true, stock: { $gt: 0 } };
    if (inStockOnly === "false") {
      delete filter.stock;
    }
    if (q && q.trim()) filter.name = { $regex: q.trim(), $options: "i" };
    if (category && category !== "All") filter.category = category;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    let products = await Product.find(filter)
      .populate({ path: "shop", select: "name address location category phone isActive isOpen businessHours" })
      .lean();

    // Only include products from active shops
    products = products.filter(p => p.shop && p.shop.isActive !== false);

    // Calculate distance if user location is available
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      products = products.map((p) => {
        if (p.shop?.location?.coordinates && Array.isArray(p.shop.location.coordinates)) {
          const [sLng, sLat] = p.shop.location.coordinates;
          if (sLat != null && sLng != null && !isNaN(sLat) && !isNaN(sLng)) {
            const distance = getDistanceKm(userLat, userLng, sLat, sLng);
            return { ...p, distance: parseFloat(distance.toFixed(1)) };
          }
        }
        return { ...p, distance: null };
      });

      // Only filter by distance if maxDistance is explicitly specified by user
      if (maxDistance && !isNaN(parseFloat(maxDistance))) {
        const maxDist = parseFloat(maxDistance);
        products = products.filter((p) => p.distance === null || p.distance <= maxDist);
      }
    }

    // Sort order
    if (sortBy === "distance" || (!sortBy && lat && lng)) {
      products.sort((a, b) => {
        if (a.distance != null && b.distance != null) return a.distance - b.distance;
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return 0;
      });
    } else if (sortBy === "price_asc") {
      products.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      products.sort((a, b) => b.price - a.price);
    } else if (sortBy === "trending") {
      if (lat && lng) {
        products.sort((a, b) => {
          if (a.distance != null && b.distance != null && a.distance !== b.distance) {
            return a.distance - b.distance;
          }
          if (a.distance != null) return -1;
          if (b.distance != null) return 1;
          return (b.stock || 0) - (a.stock || 0);
        });
      } else {
        products.sort((a, b) => (b.stock || 0) - (a.stock || 0) || new Date(b.createdAt) - new Date(a.createdAt));
      }
    } else if (lat && lng) {
      products.sort((a, b) => {
        if (a.distance != null && b.distance != null) return a.distance - b.distance;
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return 0;
      });
    }

    const totalResults = products.length;
    const totalPages   = Math.ceil(totalResults / parseInt(limit));
    const startIndex   = (parseInt(page) - 1) * parseInt(limit);
    const paginated    = products.slice(startIndex, startIndex + parseInt(limit));

    const responsePayload = {
      products: paginated,
      pagination: {
        total: totalResults,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    };

    await setCache(cacheKey, responsePayload, 120); // 2 min TTL
    res.setHeader("X-Cache", "MISS");
    res.json(responsePayload);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/compare", async (req, res) => {
  try {
    const { name, lat, lng } = req.query;
    if (!name) return res.status(400).json({ message: "Product name required" });

    const cacheKey = `compare:${JSON.stringify(req.query)}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    let products = await Product.find({
      name: { $regex: name, $options: "i" },
      isAvailable: true,
      stock: { $gt: 0 },
    })
      .populate({ path: "shop", select: "name address location category phone isActive isOpen" })
      .lean();

    products = products.filter(p => p.shop && p.shop.isActive !== false);

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      products = products.map((p) => {
        if (p.shop?.location?.coordinates) {
          const [sLng, sLat] = p.shop.location.coordinates;
          return { ...p, distance: parseFloat(getDistanceKm(userLat, userLng, sLat, sLng).toFixed(2)) };
        }
        return { ...p, distance: null };
      });
    }

    products.sort((a, b) => a.price - b.price);

    const result = {
      productName: name,
      count: products.length,
      lowestPrice: products[0]?.price ?? null,
      products,
    };

    await setCache(cacheKey, result, 120); // 2 min TTL
    res.setHeader("X-Cache", "MISS");
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/nearby-shops", async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10 } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });

    const cacheKey = `nearby:${lat}:${lng}:${maxDistance}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const shops = await Shop.find({
      isActive: true,
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(maxDistance) * 1000,
        },
      },
    }).limit(20);

    const result = { count: shops.length, shops };
    await setCache(cacheKey, result, 120); // 2 min TTL
    res.setHeader("X-Cache", "MISS");
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
