const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

// GET /api/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({
        name: 1,
      });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(
      "Get all users error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get users.",
    });
  }
};

// GET /api/users/me
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password"
    );

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

// GET /api/users/:userId
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "-password"
    );

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
    console.error(
      "Get user profile error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to get user profile.",
    });
  }
};

// PUT /api/users/me
const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "profileImage",
      "coverImage",
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

    if (
      updates.name !== undefined &&
      updates.name.trim().length < 2
    ) {
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
    console.error(
      "Update profile error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};

// POST /api/users/me/profile-image
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a profile image.",
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed.",
      });
    }

    const uploadResult = await new Promise(
      (resolve, reject) => {
        const uploadStream =
          cloudinary.uploader.upload_stream(
            {
              folder: "alumniconnect/profiles",
              resource_type: "image",
              use_filename: true,
              unique_filename: true,
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

        uploadStream.end(req.file.buffer);
      }
    );

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        profileImage: uploadResult.secure_url,
      },
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

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully.",
      user,
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      },
    });
  } catch (error) {
    console.error(
      "Upload profile image error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to upload profile image.",
    });
  }
};

// POST /api/users/me/cover-image
const uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a cover image.",
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed.",
      });
    }

    const uploadResult = await new Promise(
      (resolve, reject) => {
        const uploadStream =
          cloudinary.uploader.upload_stream(
            {
              folder: "alumniconnect/covers",
              resource_type: "image",
              use_filename: true,
              unique_filename: true,
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

        uploadStream.end(req.file.buffer);
      }
    );

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        coverImage: uploadResult.secure_url,
      },
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

    return res.status(200).json({
      success: true,
      message: "Cover image uploaded successfully.",
      user,
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      },
    });
  } catch (error) {
    console.error(
      "Upload cover image error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to upload cover image.",
    });
  }
};

module.exports = {
  getAllUsers,
  getMyProfile,
  getUserProfile,
  updateMyProfile,
  uploadProfileImage,
  uploadCoverImage,
};