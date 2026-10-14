
const express = require("express");
const multer = require("multer");

const {
  getAllUsers,
  getMyProfile,
  getUserProfile,
  updateMyProfile,
  uploadProfileImage,
  uploadCoverImage,
} = require("../controllers/userController");

const {
  updateUserStatus,
  updateAlumniVerification,
} = require("../controllers/adminUserController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }

    return cb(new Error("Only image files are allowed."));
  },
});

// Admin routes
router.get("/", protect, adminOnly, getAllUsers);

router.patch(
  "/:userId/status",
  protect,
  adminOnly,
  updateUserStatus
);

router.patch(
  "/:userId/verification",
  protect,
  adminOnly,
  updateAlumniVerification
);

// Current user's profile
router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);

router.post(
  "/me/profile-image",
  protect,
  upload.single("file"),
  uploadProfileImage
);

router.post(
  "/me/cover-image",
  protect,
  upload.single("file"),
  uploadCoverImage
);

// Other user's profile
router.get("/:userId", protect, getUserProfile);

module.exports = router;
