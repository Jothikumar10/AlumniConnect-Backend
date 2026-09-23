const express = require("express");

const {
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowers,
  getFollowing,
} = require("../controllers/followController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Follow User
|--------------------------------------------------------------------------
| POST /api/follows/:userId
*/
router.post(
  "/:userId",
  protect,
  followUser
);

/*
|--------------------------------------------------------------------------
| Unfollow User
|--------------------------------------------------------------------------
| DELETE /api/follows/:userId
*/
router.delete(
  "/:userId",
  protect,
  unfollowUser
);

/*
|--------------------------------------------------------------------------
| Check Follow Status
|--------------------------------------------------------------------------
| GET /api/follows/status/:userId
*/
router.get(
  "/status/:userId",
  protect,
  getFollowStatus
);

/*
|--------------------------------------------------------------------------
| Get Followers
|--------------------------------------------------------------------------
| GET /api/follows/followers/:userId
*/
router.get(
  "/followers/:userId",
  protect,
  getFollowers
);

/*
|--------------------------------------------------------------------------
| Get Following
|--------------------------------------------------------------------------
| GET /api/follows/following/:userId
*/
router.get(
  "/following/:userId",
  protect,
  getFollowing
);

module.exports = router;