
const mongoose = require("mongoose");
const Job = require("../models/Job");

// Create a new job
const createJob = async (req, res) => {
  try {
    const {
      title,
      company,
      description,
      location,
      jobType,
    } = req.body;

    if (
      !title?.trim() ||
      !company?.trim() ||
      !description?.trim() ||
      !location?.trim() ||
      !jobType
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required job details.",
      });
    }

    const allowedJobTypes = [
      "Full-time",
      "Part-time",
      "Internship",
      "Contract",
    ];

    if (!allowedJobTypes.includes(jobType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job type.",
      });
    }

    const job = await Job.create({
      title: title.trim(),
      company: company.trim(),
      description: description.trim(),
      location: location.trim(),
      jobType,
      postedBy: req.user._id,
      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      message: "Job submitted for admin approval.",
      job,
    });
  } catch (error) {
    console.error("Create job error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create job.",
    });
  }
};

// Get approved jobs for the public Jobs page
const getApprovedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: "Approved" })
      .populate("postedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Get approved jobs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch approved jobs.",
    });
  }
};

// Get jobs posted by the logged-in user
const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({
      postedBy: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Get my jobs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your jobs.",
    });
  }
};

// Get one approved job by ID
const getApprovedJobById = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    const job = await Job.findOne({
      _id: jobId,
      status: "Approved",
    }).populate("postedBy", "name email");

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Approved job not found.",
      });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("Get job details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch job details.",
    });
  }
};

module.exports = {
  createJob,
  getApprovedJobs,
  getMyJobs,
  getApprovedJobById,
};
