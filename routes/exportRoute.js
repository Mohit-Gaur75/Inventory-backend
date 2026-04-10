const express   = require("express");
const router    = express.Router();
const PDFDoc    = require("pdfkit");
const { stringify } = require("csv-stringify/sync");
const Product   = require("../models/Product");
const Shop      = require("../models/Shop");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/products.csv", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: "No shop found" });

    const products = await Product.find({ shop: shop._id }).lean();

    const rows = [
      ["Name", "Category", "Price (₹)", "Stock", "Unit", "Available", "Description", "Created At"],
      ...products.map((p) => [
        p.name,
        p.category,
        p.price,
        p.stock,
        p.unit,
        p.isAvailable ? "Yes" : "No",
        p.description || "",
        new Date(p.createdAt).toLocaleDateString("en-IN"),
      ]),
    ];

    const csv = stringify(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${shop.name}-products.csv"`);
    res.send("\uFEFF" + csv); // BOM for Excel
  } catch (err) {
    res.status(500).json({ message: "Export failed", error: err.message });
  }
});

router.get("/low-stock.csv", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;
    const shop      = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: "No shop found" });

    const products = await Product.find({
      shop:  shop._id,
      stock: { $lte: threshold },
    }).lean();

    const rows = [
      ["Name", "Category", "Price (₹)", "Stock", "Unit"],
      ...products.map((p) => [p.name, p.category, p.price, p.stock, p.unit]),
    ];

    const csv = stringify(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${shop.name}-low-stock.csv"`);
    res.send("\uFEFF" + csv);
  } catch (err) {
    res.status(500).json({ message: "Export failed", error: err.message });
  }
});

router.get("/inventory.pdf", protect, authorize("shopkeeper"), async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: "No shop found" });

    const products = await Product.find({ shop: shop._id }).lean();

    const totalValue    = products.reduce((s, p) => s + p.price * p.stock, 0);
    const totalProducts = products.length;
    const outOfStock    = products.filter((p) => !p.isAvailable).length;
    const lowStock      = products.filter((p) => p.isAvailable && p.stock <= 5).length;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${shop.name}-inventory.pdf"`);

    const doc = new PDFDoc({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("LocalMart — Inventory Report", { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#6b7280")
      .text(`Shop: ${shop.name}  ·  ${shop.category}  ·  Generated: ${new Date().toLocaleDateString("en-IN")}`, { align: "center" });
    doc.moveDown(1);

    const boxY  = doc.y;
    const boxW  = (doc.page.width - 80) / 4;
    const boxes = [
      { label: "Total Products", value: totalProducts },
      { label: "Out of Stock",   value: outOfStock },
      { label: "Low Stock",      value: lowStock },
      { label: "Inventory Value", value: `₹${totalValue.toLocaleString("en-IN")}` },
    ];
    boxes.forEach((b, i) => {
      const x = 40 + i * (boxW + 6);
      doc.rect(x, boxY, boxW, 50).fillAndStroke("#fff7ed", "#f97316");
      doc.fillColor("#7c3aed").fontSize(18).font("Helvetica-Bold")
        .text(String(b.value), x + 5, boxY + 8, { width: boxW - 10, align: "center" });
      doc.fillColor("#6b7280").fontSize(8).font("Helvetica")
        .text(b.label, x + 5, boxY + 32, { width: boxW - 10, align: "center" });
    });
    doc.moveDown(4);


    const colWidths = [160, 90, 55, 45, 45, 70];
    const headers   = ["Product Name", "Category", "Price ₹", "Stock", "Unit", "Value ₹"];
    const startX    = 40;
    let   y         = doc.y + 10;

    
    doc.rect(startX, y, doc.page.width - 80, 20).fill("#f97316");
    let x = startX;
    headers.forEach((h, i) => {
      doc.fillColor("white").fontSize(9).font("Helvetica-Bold")
        .text(h, x + 4, y + 5, { width: colWidths[i] - 8, align: i >= 2 ? "right" : "left" });
      x += colWidths[i];
    });
    y += 20;

    products.forEach((p, idx) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      const bg = idx % 2 === 0 ? "#ffffff" : "#fef3c7";
      doc.rect(startX, y, doc.page.width - 80, 18).fill(bg);

      const rowData = [
        p.name,
        p.category,
        p.price.toFixed(0),
        p.stock,
        p.unit,
        (p.price * p.stock).toFixed(0),
      ];
      x = startX;
      rowData.forEach((cell, i) => {
        doc
          .fillColor(p.isAvailable ? "#374151" : "#ef4444")
          .fontSize(8)
          .font("Helvetica")
          .text(String(cell), x + 4, y + 4, { width: colWidths[i] - 8, align: i >= 2 ? "right" : "left" });
        x += colWidths[i];
      });
      y += 18;
    });

  
    doc.moveDown(2)
      .fontSize(9)
      .fillColor("#9ca3af")
      .text("Generated by LocalMart · This report is for internal use only.", { align: "center" });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "PDF generation failed", error: err.message });
  }
});

module.exports = router;
