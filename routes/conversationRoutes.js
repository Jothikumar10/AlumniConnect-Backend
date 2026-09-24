const express = require("express");

const {
  getConversations,
  getOrCreateConversation,
  getConversationById,
} = require("../controllers/conversationController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Get All Conversations
|--------------------------------------------------------------------------
| GET /api/conversations
|
| Returns all conversations belonging to the logged-in user.
|--------------------------------------------------------------------------
*/
router.get(
  "/",
  protect,
  getConversations
);

/*
|--------------------------------------------------------------------------
| Get or Create Conversation With Another User
|--------------------------------------------------------------------------
| GET /api/conversations/user/:userId
|
| Finds an existing conversation with the specified user.
| If one does not exist, creates a new conversation.
|--------------------------------------------------------------------------
*/
router.get(
  "/user/:userId",
  protect,
  getOrCreateConversation
);

/*
|--------------------------------------------------------------------------
| Get Conversation By Conversation ID
|--------------------------------------------------------------------------
| GET /api/conversations/id/:conversationId
|
| Returns one specific conversation using its conversation ID.
|--------------------------------------------------------------------------
*/
router.get(
  "/id/:conversationId",
  protect,
  getConversationById
);

module.exports = router;