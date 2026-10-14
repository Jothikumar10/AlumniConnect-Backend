const express = require("express");

const {
  applyForJob,
  getMyApplications,
  getApplicationsForMyJobs,
  updateApplicationStatus,
} = require("../controllers/jobApplicationController");

const protect = require("../middleware/authMiddleware");
const uploadResume = require("../middleware/uploadResume");

const router = express.Router();

// Apply for an approved job with an optional resume upload
router.post(
  "/:jobId/apply",
  protect,
  uploadResume.single("resume"),
  applyForJob
);

// Get applications submitted by the logged-in user
router.get("/my-applications", protect, getMyApplications);

// Get applications for jobs posted by the logged-in user
router.get("/my-jobs", protect, getApplicationsForMyJobs);

// Update an application status
router.patch(
  "/:applicationId/status",
  protect,
  updateApplicationStatus
);

module.exports = router;