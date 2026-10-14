const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const Job = require("../models/Job");
const JobApplication = require("../models/JobApplication");

// Apply for an approved job with a PDF resume
const applyForJob = async (req, res) => {
  let applicationCreated = false;

  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body || {};

    // Validate job ID
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID.",
      });
    }

    // Find an approved job
    const job = await Job.findOne({
      _id: jobId,
      status: "Approved",
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Approved job not found.",
      });
    }

    // Require a PDF resume
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload your resume in PDF format.",
      });
    }

    // Store a relative URL for the uploaded resume
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;

    // Create job application
    const application = await JobApplication.create({
      job: job._id,
      applicant: req.user._id,
      coverLetter: coverLetter || "",
      resumeUrl,
    });

    applicationCreated = true;

    return res.status(201).json({
      success: true,
      message: "Job application submitted successfully.",
      application,
    });
  } catch (error) {
    // Remove uploaded file if application creation failed
    if (req.file && !applicationCreated) {
      const filePath = path.join(
        process.cwd(),
        "uploads",
        "resumes",
        req.file.filename
      );

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error("Resume cleanup error:", fileError);
      }
    }

    // Handle duplicate applications
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job.",
      });
    }

    console.error("Apply for job error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit job application.",
    });
  }
};

// Get applications submitted by the logged-in user
const getMyApplications = async (req, res) => {
  try {
    const applications = await JobApplication.find({
      applicant: req.user._id,
    })
      .populate("job", "title company location jobType status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Get my applications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your applications.",
    });
  }
};

// Get applications for jobs posted by the logged-in user
const getApplicationsForMyJobs = async (req, res) => {
  try {
    // Find jobs posted by the logged-in user
    const jobs = await Job.find({
      postedBy: req.user._id,
    }).select("_id");

    const jobIds = jobs.map((job) => job._id);

    // Fetch applications only for those jobs
    const applications = await JobApplication.find({
      job: { $in: jobIds },
    })
      .populate("job", "title company location")
      .populate("applicant", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Get job applications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch job applications.",
    });
  }
};

// Update application status for a job the user posted
const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body || {};

    const allowedStatuses = [
      "Applied",
      "Under Review",
      "Shortlisted",
      "Interview",
      "Selected",
      "Rejected",
    ];

    // Validate application ID
    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID.",
      });
    }

    // Validate requested status
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application status.",
      });
    }

    // Find the application
    const application = await JobApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    // Verify that the logged-in user posted the associated job
    const job = await Job.findOne({
      _id: application.job,
      postedBy: req.user._id,
    });

    if (!job) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this application.",
      });
    }

    application.status = status;
    await application.save();

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully.",
      application,
    });
  } catch (error) {
    console.error("Update application status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update application status.",
    });
  }
};

module.exports = {
  applyForJob,
  getMyApplications,
  getApplicationsForMyJobs,
  updateApplicationStatus,
};