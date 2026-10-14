const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

// ============================================================
// GET /api/users
// Get all users
// ============================================================
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
    console.error("Get all users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get users.",
    });
  }
};

// ============================================================
// GET /api/users/me
// Get logged-in user's profile
// ============================================================
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get profile.",
    });
  }
};

// ============================================================
// GET /api/users/:userId
// Get another user's profile
// ============================================================
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get user profile.",
    });
  }
};

// ============================================================
// PUT /api/users/me
// Update logged-in user's profile
// ============================================================
const updateMyProfile = async (req, res) => {
  try {
    console.log("=================================");
    console.log("UPDATE PROFILE REQUEST");
    console.log("User ID:", req.user?._id);
    console.log("Request Body:", req.body);
    console.log("=================================");

    /*
    |--------------------------------------------------------------------------
    | Allowed Fields
    |--------------------------------------------------------------------------
    */

    const allowedFields = [
      // Basic
      "name",
      "bio",
      "phone",
      "location",

      // Images
      "profileImage",
      "coverImage",

      // Education
      "degree",
      "department",
      "college",
      "graduationYear",
      "cgpa",
      "educationDetails",

      // Professional
      "company",
      "jobRole",
      "experience",
      "industry",
      "employmentType",
      "careerStatus",
      "previousCompany",

      // Skills
      "skills",

      // Achievements
      "achievements",
      "certifications",

      // Mentorship
      "mentorshipAvailable",
      "referralsAvailable",
      "mentorshipAreas",

      // Social
      "linkedin",
      "github",
      "portfolio",

      // Additional
      "languages",
      "interests",

      // Resume
      "resumeUrl",
    ];

    const updates = {};

    /*
    |--------------------------------------------------------------------------
    | Pick Only Allowed Fields
    |--------------------------------------------------------------------------
    */

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    /*
    |--------------------------------------------------------------------------
    | Name Validation
    |--------------------------------------------------------------------------
    */

    if (updates.name !== undefined) {
      if (
        typeof updates.name !== "string" ||
        updates.name.trim().length < 2
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name must contain at least 2 characters.",
        });
      }

      updates.name = updates.name.trim();
    }

    /*
    |--------------------------------------------------------------------------
    | Bio Validation
    |--------------------------------------------------------------------------
    */

    if (updates.bio !== undefined) {
      if (typeof updates.bio !== "string") {
        return res.status(400).json({
          success: false,
          message: "Bio must be a text value.",
        });
      }

      updates.bio = updates.bio.trim();

      if (updates.bio.length > 500) {
        return res.status(400).json({
          success: false,
          message:
            "Bio cannot exceed 500 characters.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Graduation Year
    |--------------------------------------------------------------------------
    */

    if (updates.graduationYear !== undefined) {
      if (
        updates.graduationYear === "" ||
        updates.graduationYear === null
      ) {
        updates.graduationYear = null;
      } else {
        const graduationYear = Number(
          updates.graduationYear
        );

        if (Number.isNaN(graduationYear)) {
          return res.status(400).json({
            success: false,
            message:
              "Graduation year must be a valid number.",
          });
        }

        updates.graduationYear = graduationYear;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CGPA
    |--------------------------------------------------------------------------
    */

    if (updates.cgpa !== undefined) {
      if (
        updates.cgpa === "" ||
        updates.cgpa === null
      ) {
        updates.cgpa = null;
      } else {
        const cgpa = Number(updates.cgpa);

        if (Number.isNaN(cgpa)) {
          return res.status(400).json({
            success: false,
            message:
              "CGPA must be a valid number.",
          });
        }

        if (cgpa < 0 || cgpa > 10) {
          return res.status(400).json({
            success: false,
            message:
              "CGPA must be between 0 and 10.",
          });
        }

        updates.cgpa = cgpa;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Skills
    |--------------------------------------------------------------------------
    */

    if (updates.skills !== undefined) {
      if (Array.isArray(updates.skills)) {
        updates.skills = updates.skills
          .map((skill) => String(skill).trim())
          .filter(Boolean);
      } else if (
        typeof updates.skills === "string"
      ) {
        updates.skills = updates.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean);
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Skills must be an array.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Achievements
    |--------------------------------------------------------------------------
    */

    if (updates.achievements !== undefined) {
      if (Array.isArray(updates.achievements)) {
        updates.achievements =
          updates.achievements
            .map((item) => String(item).trim())
            .filter(Boolean);
      } else if (
        typeof updates.achievements === "string"
      ) {
        updates.achievements =
          updates.achievements
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Achievements must be an array.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Certifications
    |--------------------------------------------------------------------------
    */

    if (updates.certifications !== undefined) {
      if (Array.isArray(updates.certifications)) {
        updates.certifications =
          updates.certifications
            .map((item) => String(item).trim())
            .filter(Boolean);
      } else if (
        typeof updates.certifications === "string"
      ) {
        updates.certifications =
          updates.certifications
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Certifications must be an array.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Mentorship Areas
    |--------------------------------------------------------------------------
    */

    if (updates.mentorshipAreas !== undefined) {
      if (Array.isArray(updates.mentorshipAreas)) {
        updates.mentorshipAreas =
          updates.mentorshipAreas
            .map((item) => String(item).trim())
            .filter(Boolean);
      } else if (
        typeof updates.mentorshipAreas === "string"
      ) {
        updates.mentorshipAreas =
          updates.mentorshipAreas
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Mentorship areas must be an array.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Languages
    |--------------------------------------------------------------------------
    */

    if (updates.languages !== undefined) {
      if (Array.isArray(updates.languages)) {
        updates.languages = updates.languages
          .map((item) => String(item).trim())
          .filter(Boolean);
      } else if (
        typeof updates.languages === "string"
      ) {
        updates.languages = updates.languages
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Languages must be an array.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Interests
    |--------------------------------------------------------------------------
    */

    if (updates.interests !== undefined) {
      if (Array.isArray(updates.interests)) {
        updates.interests = updates.interests
          .map((item) => String(item).trim())
          .filter(Boolean);
      } else if (
        typeof updates.interests === "string"
      ) {
        updates.interests = updates.interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Interests must be an array.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Boolean Fields
    |--------------------------------------------------------------------------
    */

    const booleanFields = [
      "mentorshipAvailable",
      "referralsAvailable",
    ];

    booleanFields.forEach((field) => {
      if (updates[field] !== undefined) {
        if (typeof updates[field] === "string") {
          updates[field] =
            updates[field] === "true";
        } else {
          updates[field] = Boolean(
            updates[field]
          );
        }
      }
    });

    /*
    |--------------------------------------------------------------------------
    | Clean String Fields
    |--------------------------------------------------------------------------
    */

    const stringFields = [
      "phone",
      "location",

      // Education
      "degree",
      "department",
      "college",
      "educationDetails",

      // Professional
      "company",
      "jobRole",
      "experience",
      "industry",
      "employmentType",
      "careerStatus",
      "previousCompany",

      // Social
      "linkedin",
      "github",
      "portfolio",

      // Resume
      "resumeUrl",

      // Images
      "profileImage",
      "coverImage",
    ];

    stringFields.forEach((field) => {
      if (updates[field] !== undefined) {
        if (typeof updates[field] === "string") {
          updates[field] = updates[field].trim();
        }
      }
    });

    /*
    |--------------------------------------------------------------------------
    | Debug
    |--------------------------------------------------------------------------
    */

    console.log(
      "Processed updates:",
      updates
    );

    /*
    |--------------------------------------------------------------------------
    | Update MongoDB
    |--------------------------------------------------------------------------
    */

    const user =
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: updates,
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

    console.log(
      "Profile updated successfully:",
      user._id
    );

    return res.status(200).json({
      success: true,
      message:
        "Profile updated successfully.",
      user,
    });
  } catch (error) {
    console.error("=================================");
    console.error("UPDATE PROFILE ERROR");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Request Body:", req.body);
    console.error("Stack:", error.stack);
    console.error("=================================");

    /*
    |--------------------------------------------------------------------------
    | Mongoose Validation Error
    |--------------------------------------------------------------------------
    */

    if (error.name === "ValidationError") {
      const validationErrors =
        Object.values(error.errors).map(
          (err) => err.message
        );

      return res.status(400).json({
        success: false,
        message:
          validationErrors.join(", "),
        errors: validationErrors,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Mongoose Cast Error
    |--------------------------------------------------------------------------
    */

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid value for ${error.path}.`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Server Error
    |--------------------------------------------------------------------------
    */

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to update profile.",
    });
  }
};

// ============================================================
// POST /api/users/me/profile-image
// Upload profile image
// ============================================================
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a profile image.",
      });
    }

    if (
      !req.file.mimetype.startsWith("image/")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only image files are allowed.",
      });
    }

    const uploadResult =
      await new Promise(
        (resolve, reject) => {
          const uploadStream =
            cloudinary.uploader.upload_stream(
              {
                folder:
                  "alumniconnect/profiles",
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

          uploadStream.end(
            req.file.buffer
          );
        }
      );

    const user =
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            profileImage:
              uploadResult.secure_url,
          },
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
      message:
        "Profile image uploaded successfully.",
      user,
      data: {
        url: uploadResult.secure_url,
        publicId:
          uploadResult.public_id,
      },
    });
  } catch (error) {
    console.error(
      "Upload profile image error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to upload profile image.",
    });
  }
};

// ============================================================
// POST /api/users/me/cover-image
// Upload cover image
// ============================================================
const uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a cover image.",
      });
    }

    if (
      !req.file.mimetype.startsWith("image/")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only image files are allowed.",
      });
    }

    const uploadResult =
      await new Promise(
        (resolve, reject) => {
          const uploadStream =
            cloudinary.uploader.upload_stream(
              {
                folder:
                  "alumniconnect/covers",
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

          uploadStream.end(
            req.file.buffer
          );
        }
      );

    const user =
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            coverImage:
              uploadResult.secure_url,
          },
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
      message:
        "Cover image uploaded successfully.",
      user,
      data: {
        url: uploadResult.secure_url,
        publicId:
          uploadResult.public_id,
      },
    });
  } catch (error) {
    console.error(
      "Upload cover image error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to upload cover image.",
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getAllUsers,
  getMyProfile,
  getUserProfile,
  updateMyProfile,
  uploadProfileImage,
  uploadCoverImage,
};