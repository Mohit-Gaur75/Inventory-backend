const helmet        = require("helmet");
const rateLimit     = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss           = require("xss-clean");


const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, 
});


const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { message: "Too many requests. Try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health", 
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, 
  message: { message: "Too many attempts. Try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});


const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 30,
  message: { message: "Too many search requests. Slow down." },
});


const sanitizeMiddleware = mongoSanitize({ replaceWith: "_" });


const xssMiddleware = xss();

module.exports = {
  helmetMiddleware,
  apiLimiter,
  authLimiter,
  searchLimiter,
  sanitizeMiddleware,
  xssMiddleware,
};