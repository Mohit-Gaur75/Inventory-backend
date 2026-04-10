const express = require("express");
const http    = require("http");
const cors    = require("cors");
const dotenv  = require("dotenv");
const path    = require("path");
const validateEnv = require("./config/validateEnv");
const { initSocket } = require("./socket");
const connectDB = require("./config/db");
const {
  helmetMiddleware,
  apiLimiter,
  sanitizeMiddleware,
  xssMiddleware,
} = require("./middleware/security");

 
dotenv.config();
validateEnv();
connectDB();
 
const app    = express();
const server = http.createServer(app);
const io     = initSocket(server);
app.set("io", io);
 
app.use(helmetMiddleware);
app.use(sanitizeMiddleware);
app.use(xssMiddleware);
 
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.CLIENT_URL,
].filter(Boolean);
 
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin} not allowed`));
  },
  credentials: true,
  methods:     ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
 
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
 
app.use("/api/", apiLimiter);
 
app.use("/api/auth",          require("./routes/authRoute"));
app.use("/api/shops",         require("./routes/shopRoute"));
app.use("/api/products",      require("./routes/productRoute"));
app.use("/api/search",        require("./routes/searchRoute"));
app.use("/api/favourites",    require("./routes/favouriteRoute"));
app.use("/api/reviews",       require("./routes/reviewRoute"));
app.use("/api/admin",         require("./routes/adminRoute"));
app.use("/api/cart",          require("./routes/cartRoute"));
app.use("/api/notifications", require("./routes/notificationRoute"));
app.use("/api/upload",        require("./routes/uploadRoute"));
 
app.use("/api/import",    require("./routes/importRoute"));    
app.use("/api/export",    require("./routes/exportRoute"));    
app.use("/api/analytics", require("./routes/analyticsRoute"));
 

app.get("/api/health", (req, res) => {
  res.json({
    status:      "OK",
    message:     "LocalMart API is running",
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});
 
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});
 
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});
 
const PORT = process.env.PORT || 1000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
 console.log("socket is ready");
});
 