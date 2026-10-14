
const express = require("express");

const {
  getAllJobs,
  updateJobStatus,
} = require("../controllers/adminJobController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

// Get all jobs
router.get("/", protect, adminOnly, getAllJobs);

// Approve or reject a job
router.patch("/:userId/status", protect, adminOnly, updateJobStatus);

module.exports = router;
