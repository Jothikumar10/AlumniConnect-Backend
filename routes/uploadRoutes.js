const express = require("express");
const multer = require("multer");

const {
  uploadMedia,
} = require("../controllers/uploadController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/",
      "video/",
      "audio/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const isAllowed = allowedTypes.some(
      (type) => {
        if (type.endsWith("/")) {
          return file.mimetype.startsWith(type);
        }

        return file.mimetype === type;
      }
    );

    if (!isAllowed) {
      return callback(
        new Error(
          "Unsupported file type. Please upload an image, video, audio, PDF, DOC, or DOCX file."
        )
      );
    }

    callback(null, true);
  },
});

router.post(
  "/media",
  protect,
  upload.single("file"),
  uploadMedia
);

module.exports = router;