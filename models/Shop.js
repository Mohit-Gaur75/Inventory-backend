const mongoose = require("mongoose");

const ShopSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Shop name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Shop category is required"],
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
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], 
        required: [true, "Location coordinates are required"],
      },
    },
    phone: String,
    email: String,
    image: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ShopSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Shop", ShopSchema);