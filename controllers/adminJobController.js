
const mongoose = require("mongoose");
const Job = require("../models/Job");

// Get all jobs for the admin dashboard
const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("postedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Get all jobs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs.",
    });
  }
};

// Approve or reject a job
const updateJobStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected.",
      });
    }

    if (
      status === "Rejected" &&
      typeof rejectionReason === "string" &&
      rejectionReason.trim().length > 500
    ) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason cannot exceed 500 characters.",
      });
    }

    const job = await Job.findById(userId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    job.status = status;

    if (status === "Rejected") {
      job.rejectionReason =
        typeof rejectionReason === "string"
          ? rejectionReason.trim()
          : "";
    } else {
      job.rejectionReason = "";
    }

    await job.save();

    await job.populate("postedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: `Job ${status.toLowerCase()} successfully.`,
      job,
    });
  } catch (error) {
    console.error("Update job status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update job status.",
    });
  }
};

module.exports = {
  getAllJobs,
  updateJobStatus,
};
