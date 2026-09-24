const express = require("express");
const multer = require("multer");

const {
  sendMessage,
  getMessages,
  getUnreadMessageCount,
  markMessagesAsRead,
} = require("../controllers/messageController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Multer Configuration
|--------------------------------------------------------------------------
*/

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/",
      "video/",
      "audio/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const isAllowed = allowedTypes.some((type) => {
      if (type.endsWith("/")) {
        return file.mimetype.startsWith(type);
      }

      return file.mimetype === type;
    });

    if (!isAllowed) {
      return callback(
        new Error(
          "Unsupported file type. Please upload an image, video, audio, PDF, DOC, or DOCX file."
        )
      );
    }

    callback(null, true);
  },
});

/*
|--------------------------------------------------------------------------
| Get Unread Message Count
|--------------------------------------------------------------------------
| GET /api/messages/unread-count
|--------------------------------------------------------------------------
| IMPORTANT:
| This route MUST come before /:conversationId
|--------------------------------------------------------------------------
*/

router.get(
  "/unread-count",
  protect,
  getUnreadMessageCount
);

/*
|--------------------------------------------------------------------------
| Send Message
|--------------------------------------------------------------------------
| POST /api/messages/:conversationId
|--------------------------------------------------------------------------
*/

router.post(
  "/:conversationId",
  protect,
  upload.single("file"),
  sendMessage
);

/*
|--------------------------------------------------------------------------
| Get Messages
|--------------------------------------------------------------------------
| GET /api/messages/:conversationId
|--------------------------------------------------------------------------
*/

router.get(
  "/:conversationId",
  protect,
  getMessages
);

/*
|--------------------------------------------------------------------------
| Mark Messages As Read
|--------------------------------------------------------------------------
| PUT /api/messages/:conversationId/read
|--------------------------------------------------------------------------
*/

router.put(
  "/:conversationId/read",
  protect,
  markMessagesAsRead
);

module.exports = router;