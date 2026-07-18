const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure upload storage properties
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '../uploads/');
    // Auto-create directory if missing
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

// Enforce image and video mime types
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|mp4|webm|mov|ogg/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedExtensions.test(file.mimetype) || file.mimetype.startsWith('video/');
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPG, JPEG, PNG, WEBP) and videos (MP4, WEBM, MOV, OGG) are supported.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max limit
  }
});

module.exports = upload;
