const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      enum: [
        "Grocery",
        "Electronics",
        "Clothing",
        "Pharmacy",
        "Hardware",
        "Stationery",
        "Food & Beverage",
        "Other",
      ],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      default: "piece", 
    },
    image: {
      type: String,
      default: "",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ProductSchema.pre("save", function (next) {
  this.isAvailable = this.stock > 0;
  next();
});

ProductSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Product", ProductSchema);