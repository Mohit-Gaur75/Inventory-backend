const mongoose = require("mongoose");

const DayScheduleSchema = new mongoose.Schema(
  {
    open:  { type: String, default: "09:00" },
    close: { type: String, default: "21:00" },
    isOpen: { type: Boolean, default: true },  
  },
  { _id: false }
);

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
    description: { type: String, trim: true },
    category: {
      type: String,
      required: [true, "Shop category is required"],
      enum: [
        "Grocery","Electronics","Clothing","Pharmacy",
        "Hardware","Stationery","Food & Beverage","Other",
      ],
    },
    address: {
      street: String,
      city:   String,
      state:  String,
      pincode: String,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    phone: String,
    email: String,
    image: String,
    isActive: { type: Boolean, default: true },

    isOpen: { type: Boolean, default: true },  

    businessHours: {
      type: [DayScheduleSchema],
      default: () =>
        Array.from({ length: 7 }, (_, i) => ({
          isOpen: i !== 0, 
          open:  "09:00",
          close: "21:00",
        })),
    },

    holidays: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

ShopSchema.index({ location: "2dsphere" });

ShopSchema.virtual("computedIsOpen").get(function () {
  if (!this.isOpen) return false;

  const now     = new Date();
  const todayStr = now.toISOString().slice(0, 10); 
  if (this.holidays.includes(todayStr)) return false;

  const dayIdx  = now.getDay(); 
  const hours   = this.businessHours?.[dayIdx];
  if (!hours || !hours.isOpen) return false;

  const [oh, om] = hours.open.split(":").map(Number);
  const [ch, cm] = hours.close.split(":").map(Number);
  const nowMins  = now.getHours() * 60 + now.getMinutes();
  const openMins = oh * 60 + om;
  const closeMins= ch * 60 + cm;

  return nowMins >= openMins && nowMins < closeMins;
});

ShopSchema.set("toJSON",   { virtuals: true });
ShopSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Shop", ShopSchema);
