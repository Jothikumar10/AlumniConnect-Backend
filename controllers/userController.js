const User = require("../models/User");

// GET /api/users/me
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to get profile.",
    });
  }
};

// PUT /api/users/me
const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "profileImage",
      "bio",
      "phone",
      "location",
      "department",
      "graduationYear",
      "college",
      "company",
      "jobRole",
      "skills",
      "linkedin",
      "github",
      "portfolio",
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.name !== undefined && updates.name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters.",
      });
    }

    if (
      updates.graduationYear !== undefined &&
      updates.graduationYear !== null &&
      Number.isNaN(Number(updates.graduationYear))
    ) {
      return res.status(400).json({
        success: false,
        message: "Graduation year must be a valid number.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
};