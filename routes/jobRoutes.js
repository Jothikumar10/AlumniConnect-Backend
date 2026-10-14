
const express = require("express");

const {
  createJob,
  getApprovedJobs,
  getMyJobs,
  getApprovedJobById,
} = require("../controllers/jobController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// View all approved jobs
router.get("/", getApprovedJobs);

// Create a job - login required
router.post("/", protect, createJob);

// View jobs posted by the logged-in user
router.get("/my-jobs", protect, getMyJobs);

// View one approved job
router.get("/:jobId", getApprovedJobById);

module.exports = router;
