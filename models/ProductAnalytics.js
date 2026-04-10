const mongoose = require("mongoose");

const ProductAnalyticsSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },

    // View tracking
    views: { type: Number, default: 0 },
    viewHistory: [
      {
        date:  { type: Date, default: Date.now },
        count: { type: Number, default: 1 },
      },
    ],
    cartAdds:    { type: Number, default: 0 },
    cartRemoves: { type: Number, default: 0 },

    
    favouriteCount: { type: Number, default: 0 },

    stockHistory: [
      {
        date:    { type: Date, default: Date.now },
        stock:   Number,
        delta:   Number,  
        reason:  { type: String, enum: ["manual", "import", "sale"], default: "manual" },
      },
    ],
  },
  { timestamps: true }
);

ProductAnalyticsSchema.index({ product: 1 });
ProductAnalyticsSchema.index({ shop: 1 });

module.exports = mongoose.model("ProductAnalytics", ProductAnalyticsSchema);
