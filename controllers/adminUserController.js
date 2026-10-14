
const User = require("../models/User");

const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false.",
      });
    }

    if (
      String(req.user._id) === req.params.userId &&
      !isActive
    ) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    user.isActive = isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: isActive
        ? "User account activated successfully."
        : "User account deactivated successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user status.",
    });
  }
};

const updateAlumniVerification = async (req, res) => {
  try {
    const { isVerified } = req.body;

    if (typeof isVerified !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isVerified must be true or false.",
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role !== "alumni") {
      return res.status(400).json({
        success: false,
        message: "Only alumni accounts can be verified.",
      });
    }

    user.isVerified = isVerified;
    await user.save();

    return res.status(200).json({
      success: true,
      message: isVerified
        ? "Alumni verified successfully."
        : "Alumni verification removed successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error(
      "Update alumni verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update alumni verification.",
    });
  }
};

module.exports = {
  updateUserStatus,
  updateAlumniVerification,
};
