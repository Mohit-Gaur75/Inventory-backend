const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    shop:  { type: mongoose.Schema.Types.ObjectId, ref: "Shop",  required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Grocery","Electronics","Clothing","Pharmacy","Hardware","Stationery","Food & Beverage","Other"],
    },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    unit:  { type: String, default: "piece" },

    image: { type: String, default: "" },

    images: {
      type: [String],
      default: [],
      validate: [(arr) => arr.length <= 5, "Maximum 5 images allowed"],
    },

    isAvailable: { type: Boolean, default: true },

    priceHistory: [{
      price: Number,
      date:  { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

ProductSchema.pre("save", function (next) {
  this.isAvailable = this.stock > 0;

  if (this.isModified("price")) {
    this.priceHistory.push({ price: this.price, date: new Date() });
    
    if (this.priceHistory.length > 30) {
      this.priceHistory = this.priceHistory.slice(-30);
    }
  }
  next();
});

ProductSchema.index({ name: "text", description: "text" });
ProductSchema.index({ shop: 1, isAvailable: 1 });
ProductSchema.index({ category: 1 });

module.exports = mongoose.model("Product", ProductSchema);