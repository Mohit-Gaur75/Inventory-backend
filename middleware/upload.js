const multer     = require("multer");
const sharp      = require("sharp");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG and WebP images allowed"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
});
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

/**
 * processImage
 * Compresses the raw buffer with sharp (→ WebP, max 800 px wide),
 * then streams the result to Cloudinary.
 *
 * @param {Buffer} buffer   
 * @param {string} folder   
 * @param {number} width    
 * @returns {{ imageUrl, public_id }}
 */
const processImage = async (buffer, folder = "products", width = 800) => {
  
  const processed = await sharp(buffer)
    .resize(width, null, { withoutEnlargement: true, fit: "inside" })
    .webp({ quality: 80 })
    .toBuffer();

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:        `local-inventory/${folder}`,
        resource_type: "image",
        format:        "webp",
      },
      (error, result) => {
        if (error) reject(error);
        else       resolve(result);
      }
    );
    bufferToStream(processed).pipe(uploadStream);
  });

  return {
    imageUrl:  result.secure_url,
    public_id: result.public_id, 
  };
};

/**
 * deleteImage
 * Deletes an image from Cloudinary by its public_id.
 *
 * @param {string} public_id 
 */
const deleteImage = async (public_id) => {
  if (!public_id) return;
  try {
    await cloudinary.uploader.destroy(public_id);
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
  }
};

module.exports = { upload, processImage, deleteImage };
