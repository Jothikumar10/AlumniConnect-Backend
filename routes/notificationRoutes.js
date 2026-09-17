const express = require("express");

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getNotifications);

router.get("/unread-count", protect, getUnreadCount);

router.patch("/:id/read", protect, markAsRead);

router.patch("/read-all", protect, markAllAsRead);

module.exports = router;