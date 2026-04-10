const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const csv      = require("csv-parse/sync");
const XLSX     = require("xlsx");
const Product  = require("../models/Product");
const Shop     = require("../models/Shop");
const { protect, authorize } = require("../middleware/authMiddleware");

const storage = multer.memoryStorage();
const importUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",          
      "application/octet-stream",
    ];
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (["csv", "xlsx", "xls"].includes(ext)) return cb(null, true);
    cb(new Error("Only CSV and Excel files are allowed"), false);
  },
});

const VALID_CATEGORIES = [
  "Grocery","Electronics","Clothing","Pharmacy",
  "Hardware","Stationery","Food & Beverage","Other",
];
const VALID_UNITS = ["piece","kg","gram","litre","ml","dozen","pack","box"];

const parseFile = (buffer, originalname) => {
  const ext = originalname.split(".").pop().toLowerCase();

  if (ext === "csv") {
    const text = buffer.toString("utf8");
    return csv.parse(text, {
      columns:          true,
      skip_empty_lines: true,
      trim:             true,
    });
  }

  const wb   = XLSX.read(buffer, { type: "buffer" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
};

const validateRow = (row, index) => {
  const errors = [];
  const num    = index + 2; 

  const name     = (row.name || row.Name || "").toString().trim();
  const category = (row.category || row.Category || "").toString().trim();
  const price    = parseFloat(row.price || row.Price);
  const stock    = parseInt(row.stock  || row.Stock, 10);
  const unit     = (row.unit || row.Unit || "piece").toString().trim();

  if (!name)                               errors.push(`Row ${num}: name is required`);
  if (!VALID_CATEGORIES.includes(category)) errors.push(`Row ${num}: invalid category "${category}"`);
  if (isNaN(price) || price < 0)           errors.push(`Row ${num}: invalid price`);
  if (isNaN(stock) || stock < 0)           errors.push(`Row ${num}: invalid stock`);
  if (!VALID_UNITS.includes(unit))         errors.push(`Row ${num}: invalid unit "${unit}"`);

  return {
    errors,
    parsed: errors.length === 0 ? { name, category, price, stock, unit,
      description: (row.description || row.Description || "").toString().trim(),
    } : null,
  };
};

router.post("/preview", protect, authorize("shopkeeper"), importUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const rows = parseFile(req.file.buffer, req.file.originalname);
    if (rows.length === 0) return res.status(400).json({ message: "File is empty" });
    if (rows.length > 500) return res.status(400).json({ message: "Max 500 rows per import" });

    const valid   = [];
    const invalid = [];

    rows.forEach((row, i) => {
      const { errors, parsed } = validateRow(row, i);
      if (errors.length) {
        invalid.push({ row: i + 2, errors });
      } else {
        valid.push(parsed);
      }
    });

    res.json({
      total:   rows.length,
      valid:   valid.length,
      invalid: invalid.length,
      preview: valid.slice(0, 10),   
      errors:  invalid,
    });
  } catch (err) {
    res.status(500).json({ message: "Parse failed", error: err.message });
  }
});

router.post("/confirm", protect, authorize("shopkeeper"), importUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ message: "Create a shop first" });

    const mode = req.body.mode === "update" ? "update" : "skip"; 

    const rows = parseFile(req.file.buffer, req.file.originalname);
    const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const { errors, parsed } = validateRow(rows[i], i);
      if (errors.length) {
        results.errors.push(...errors);
        continue;
      }

      const existing = await Product.findOne({ shop: shop._id, name: parsed.name });

      if (existing) {
        if (mode === "update") {
          Object.assign(existing, parsed);
          await existing.save();
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await Product.create({ ...parsed, shop: shop._id, owner: req.user._id });
        results.inserted++;
      }
    }

    try {
      await Shop.findByIdAndUpdate(shop._id, {
        $push: {
          importHistory: {
            $each: [{ date: new Date(), ...results, filename: req.file.originalname }],
            $slice: -20, 
          },
        },
      });
    } catch {}

    res.json({ message: "Import complete", ...results });
  } catch (err) {
    res.status(500).json({ message: "Import failed", error: err.message });
  }
});

router.get("/template", protect, authorize("shopkeeper"), (req, res) => {
  const headers = "name,description,category,price,stock,unit\n";
  const example = "Basmati Rice 5kg,Long grain basmati rice,Grocery,450,100,kg\n"
                + "Surf Excel 1kg,Detergent powder,Grocery,180,50,piece\n";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=localmart-product-template.csv");
  res.send(headers + example);
});

module.exports = router;
