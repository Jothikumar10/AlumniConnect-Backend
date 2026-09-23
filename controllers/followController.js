const Follow = require("../models/Follow");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Follow User
|--------------------------------------------------------------------------
| POST /api/follows/:userId
*/
const followUser = async (req, res) => {
  try {
    const followerId = req.user._id;
    const followingId = req.params.userId;

    if (!followingId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // Cannot follow yourself
    if (
      followerId.toString() ===
      followingId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself.",
      });
    }

    // Check if user exists
    const user = await User.findById(followingId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check existing follow
    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: followingId,
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: "You are already following this user.",
      });
    }

    // Create follow
    const follow = await Follow.create({
      follower: followerId,
      following: followingId,
    });

    return res.status(201).json({
      success: true,
      message: "User followed successfully.",
      follow,
    });
  } catch (error) {
    console.error("Follow user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to follow user.",
      error: error.message,
    });
  }
};


/*
|--------------------------------------------------------------------------
| Unfollow User
|--------------------------------------------------------------------------
| DELETE /api/follows/:userId
*/
const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user._id;
    const followingId = req.params.userId;

    if (!followingId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const follow = await Follow.findOneAndDelete({
      follower: followerId,
      following: followingId,
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: "You are not following this user.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User unfollowed successfully.",
    });
  } catch (error) {
    console.error("Unfollow user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to unfollow user.",
      error: error.message,
    });
  }
};


/*
|--------------------------------------------------------------------------
| Get Follow Status
|--------------------------------------------------------------------------
| GET /api/follows/status/:userId
*/
const getFollowStatus = async (req, res) => {
  try {
    const followerId = req.user._id;
    const followingId = req.params.userId;

    if (!followingId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // Own profile
    if (
      followerId.toString() ===
      followingId.toString()
    ) {
      return res.status(200).json({
        success: true,
        following: false,
        self: true,
        follow: null,
      });
    }

    const follow = await Follow.findOne({
      follower: followerId,
      following: followingId,
    });

    return res.status(200).json({
      success: true,
      following: !!follow,
      self: false,
      follow: follow || null,
    });
  } catch (error) {
    console.error(
      "Get follow status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get follow status.",
      error: error.message,
    });
  }
};


/*
|--------------------------------------------------------------------------
| Get Followers
|--------------------------------------------------------------------------
| GET /api/follows/followers/:userId
*/
const getFollowers = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const followers = await Follow.find({
      following: userId,
    })
      .populate(
        "follower",
        "name profileImage jobRole company role"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: followers.length,
      followers,
    });
  } catch (error) {
    console.error(
      "Get followers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get followers.",
      error: error.message,
    });
  }
};


/*
|--------------------------------------------------------------------------
| Get Following
|--------------------------------------------------------------------------
| GET /api/follows/following/:userId
|--------------------------------------------------------------------------
*/
const getFollowing = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const following = await Follow.find({
      follower: userId,
    })
      .populate(
        "following",
        "name profileImage jobRole company role"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: following.length,
      following,
    });
  } catch (error) {
    console.error(
      "Get following error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get following.",
      error: error.message,
    });
  }
};


module.exports = {
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowers,
  getFollowing,
};