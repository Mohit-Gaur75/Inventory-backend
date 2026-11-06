const Redis = require("ioredis");

let redisClient = null;
let isConnected = false;

const initRedis = () => {
  const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`;

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 5) {
          console.warn("⚠️  [Redis] Max reconnection attempts reached. Continuing without cache.");
          return null; // stop retrying until next manual trigger
        }
        return Math.min(times * 500, 2000);
      },
      connectTimeout: 5000,
      lazyConnect: false,
    });

    redisClient.on("connect", () => {
      isConnected = true;
      console.log(`⚡ [Redis] Connected successfully to ${redisUrl}`);
    });

    redisClient.on("ready", () => {
      isConnected = true;
    });

    redisClient.on("error", (err) => {
      isConnected = false;
      // Suppress spammy connection refused logs in local dev when Redis is not running
      if (err.code === "ECONNREFUSED") {
        console.warn("⚠️  [Redis] Service unavailable at " + redisUrl + " — running without cache");
      } else {
        console.warn("⚠️  [Redis] Client error:", err.message);
      }
    });

    redisClient.on("close", () => {
      isConnected = false;
    });
  } catch (err) {
    console.warn("⚠️  [Redis] Initialization failed:", err.message);
    redisClient = null;
    isConnected = false;
  }

  return redisClient;
};

// Safe wrapper functions that never throw to caller
const getCache = async (key) => {
  if (!redisClient || !isConnected) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn(`[Redis] Get failed for ${key}:`, err.message);
    return null;
  }
};

const setCache = async (key, value, ttlSeconds = 180) => {
  if (!redisClient || !isConnected) return false;
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await redisClient.set(key, serialized, "EX", ttlSeconds);
    } else {
      await redisClient.set(key, serialized);
    }
    return true;
  } catch (err) {
    console.warn(`[Redis] Set failed for ${key}:`, err.message);
    return false;
  }
};

const delCache = async (key) => {
  if (!redisClient || !isConnected) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.warn(`[Redis] Del failed for ${key}:`, err.message);
    return false;
  }
};

const delPattern = async (pattern) => {
  if (!redisClient || !isConnected) return false;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", pattern, "COUNT", 50);
      cursor = nextCursor;
      if (keys && keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== "0");
    return true;
  } catch (err) {
    console.warn(`[Redis] DelPattern failed for ${pattern}:`, err.message);
    return false;
  }
};

// Express cache middleware
const cacheMiddleware = (keyGenerator, ttlSeconds = 180) => {
  return async (req, res, next) => {
    if (!redisClient || !isConnected) return next();

    const cacheKey = typeof keyGenerator === "function" ? keyGenerator(req) : `${keyGenerator}:${req.originalUrl}`;

    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cached);
      }

      res.setHeader("X-Cache", "MISS");
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Cache only successful responses (status 200 or 201)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, body, ttlSeconds).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch {
      next();
    }
  };
};

module.exports = {
  initRedis,
  getCache,
  setCache,
  delCache,
  delPattern,
  cacheMiddleware,
  getRedisClient: () => redisClient,
  isRedisConnected: () => isConnected,
};
