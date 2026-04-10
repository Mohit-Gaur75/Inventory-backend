const express = require("express");
const router  = express.Router();
const { upload, processImage, deleteImage } = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");

router.post("/single", protect, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const folder = req.query.folder || "products";
    const { imageUrl, public_id } = await processImage(req.file.buffer, folder);

    res.json({ message: "Uploaded successfully", imageUrl, public_id });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});
router.post("/multiple", protect, upload.array("images", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: "No files uploaded" });

    const folder  = req.query.folder || "products";
    const results = await Promise.all(
      req.files.map((file) => processImage(file.buffer, folder))
    );

    res.json({ message: "Uploaded successfully", images: results });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

router.delete("/", protect, async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id) return res.status(400).json({ message: "public_id required" });
    await deleteImage(public_id);
    res.json({ message: "Image deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;
