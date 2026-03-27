const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const {
  helmetMiddleware,
  apiLimiter,
  sanitizeMiddleware,
  xssMiddleware,
} = require("./middleware/security");

dotenv.config();
connectDB();


const app = express();


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
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/", apiLimiter);


app.use("/api/auth", require("./routes/authRoute"));
app.use("/api/shops", require("./routes/shopRoute"));
app.use("/api/products", require("./routes/productRoute"));
app.use("/api/search", require("./routes/searchRoute"));
app.use("/api/favourites", require("./routes/favouriteRoute"));
app.use("/api/reviews", require("./routes/reviewRoute"));
app.use("/api/admin", require("./routes/adminRoute"));
app.use("/api/cart", require("./routes/cartRoute"));
app.use("/api/notifications", require("./routes/notificationRoute"));



app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "LocalMart API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});


app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
  });
});



const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
});