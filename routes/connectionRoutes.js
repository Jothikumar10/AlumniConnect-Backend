const express = require("express");

const {
  sendConnectionRequest,
  getConnectionStatus,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  getConnectionRequests,
  getMyConnections,
} = require("../controllers/connectionController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Send connection request
router.post(
  "/request/:userId",
  protect,
  sendConnectionRequest
);

// Get connection status with another user
router.get(
  "/status/:userId",
  protect,
  getConnectionStatus
);

// Accept connection request
router.put(
  "/:connectionId/accept",
  protect,
  acceptConnectionRequest
);

// Reject connection request
router.put(
  "/:connectionId/reject",
  protect,
  rejectConnectionRequest
);

// Cancel connection request
router.delete(
  "/:connectionId",
  protect,
  cancelConnectionRequest
);

// Get incoming connection requests
router.get(
  "/requests",
  protect,
  getConnectionRequests
);

// Get accepted connections
router.get(
  "/",
  protect,
  getMyConnections
);

module.exports = router;