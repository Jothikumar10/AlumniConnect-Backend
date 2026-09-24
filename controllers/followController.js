const Follow = require("../models/Follow");
const User = require("../models/User");
const Notification = require("../models/Notification");

/*
|--------------------------------------------------------------------------
| Follow User
|--------------------------------------------------------------------------
| POST /api/follows/:userId
|--------------------------------------------------------------------------
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

    /*
    |--------------------------------------------------------------------------
    | Cannot follow yourself
    |--------------------------------------------------------------------------
    */
    if (followerId.toString() === followingId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check if user exists
    |--------------------------------------------------------------------------
    */
    const user = await User.findById(followingId).select(
      "name profileImage role jobRole company isActive"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check if target user is active
    |--------------------------------------------------------------------------
    */
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "This user account is inactive.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check existing follow
    |--------------------------------------------------------------------------
    */
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

    /*
    |--------------------------------------------------------------------------
    | Create follow
    |--------------------------------------------------------------------------
    */
    const follow = await Follow.create({
      follower: followerId,
      following: followingId,
    });

    /*
    |--------------------------------------------------------------------------
    | Create notification
    |--------------------------------------------------------------------------
    |
    | Example:
    |
    | Jothikumar started following you.
    |
    */
    try {
      await Notification.create({
        recipient: followingId,
        sender: followerId,
        type: "follower",
        title: "New Follower",
        message: `${req.user.name || "Someone"} started following you.`,
      });
    } catch (notificationError) {
      /*
      |--------------------------------------------------------------------------
      | Do not fail the follow operation if notification creation fails
      |--------------------------------------------------------------------------
      */
      console.error(
        "Create follow notification error:",
        notificationError
      );
    }

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
|--------------------------------------------------------------------------
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

    /*
    |--------------------------------------------------------------------------
    | Cannot unfollow yourself
    |--------------------------------------------------------------------------
    */
    if (followerId.toString() === followingId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid user.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Delete follow
    |--------------------------------------------------------------------------
    */
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

    /*
    |--------------------------------------------------------------------------
    | Optional:
    | Remove the unread follower notification created by this follow.
    |
    | This prevents an old "started following you" notification from
    | remaining unread after the user has already unfollowed.
    |--------------------------------------------------------------------------
    */
    try {
      await Notification.deleteOne({
        recipient: followingId,
        sender: followerId,
        type: "follower",
        isRead: false,
      });
    } catch (notificationError) {
      console.error(
        "Delete follow notification error:",
        notificationError
      );
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
|--------------------------------------------------------------------------
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

    /*
    |--------------------------------------------------------------------------
    | Own profile
    |--------------------------------------------------------------------------
    */
    if (followerId.toString() === followingId.toString()) {
      return res.status(200).json({
        success: true,
        following: false,
        self: true,
        follow: null,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check follow
    |--------------------------------------------------------------------------
    */
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
    console.error("Get follow status error:", error);

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
|--------------------------------------------------------------------------
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

    /*
    |--------------------------------------------------------------------------
    | Check user exists
    |--------------------------------------------------------------------------
    */
    const user = await User.findById(userId).select("_id");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get followers
    |--------------------------------------------------------------------------
    */
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
    console.error("Get followers error:", error);

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

    /*
    |--------------------------------------------------------------------------
    | Check user exists
    |--------------------------------------------------------------------------
    */
    const user = await User.findById(userId).select("_id");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get following users
    |--------------------------------------------------------------------------
    */
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
    console.error("Get following error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get following.",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Export Controllers
|--------------------------------------------------------------------------
*/
module.exports = {
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowers,
  getFollowing,
};