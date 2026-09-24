const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const connectDB = require("./config/db");

// Routes
const postRoutes = require("./routes/postRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const commentRoutes = require("./routes/commentRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const followRoutes = require("./routes/followRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

/*
|--------------------------------------------------------------------------
| MongoDB
|--------------------------------------------------------------------------
*/

connectDB();

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

/*
|--------------------------------------------------------------------------
| Body Parser
|--------------------------------------------------------------------------
*/

app.use(express.json());

/*
|--------------------------------------------------------------------------
| HTTP Server
|--------------------------------------------------------------------------
*/

const server = http.createServer(app);

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/*
|--------------------------------------------------------------------------
| Make Socket.IO Available in Express Controllers
|--------------------------------------------------------------------------
|
| This is required by messageController.js:
|
| const io = req.app.get("io");
|
*/

app.set("io", io);

/*
|--------------------------------------------------------------------------
| Socket.IO Connection
|--------------------------------------------------------------------------
*/

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  /*
  |--------------------------------------------------------------------------
  | Join User Room
  |--------------------------------------------------------------------------
  |
  | Each logged-in user gets their own room.
  |
  | Example:
  | user:68a123456789
  |
  */

  socket.on("join-user", (userId) => {
    if (!userId) {
      return;
    }

    const room = `user:${userId}`;

    socket.join(room);

    console.log(
      `User ${userId} joined room ${room}`
    );
  });

  /*
  |--------------------------------------------------------------------------
  | Join Conversation Room
  |--------------------------------------------------------------------------
  */

  socket.on("join-conversation", (conversationId) => {
    if (!conversationId) {
      return;
    }

    const room = `conversation:${conversationId}`;

    socket.join(room);

    console.log(
      `Socket ${socket.id} joined ${room}`
    );
  });

  /*
  |--------------------------------------------------------------------------
  | Leave Conversation Room
  |--------------------------------------------------------------------------
  */

  socket.on("leave-conversation", (conversationId) => {
    if (!conversationId) {
      return;
    }

    const room = `conversation:${conversationId}`;

    socket.leave(room);

    console.log(
      `Socket ${socket.id} left ${room}`
    );
  });

  /*
  |--------------------------------------------------------------------------
  | Disconnect
  |--------------------------------------------------------------------------
  */

  socket.on("disconnect", (reason) => {
    console.log(
      "Socket disconnected:",
      socket.id,
      reason
    );
  });
});

/*
|--------------------------------------------------------------------------
| Test Route
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AlumniConnect Backend is running",
  });
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/posts",
  postRoutes
);

app.use(
  "/api/comments",
  commentRoutes
);

app.use(
  "/api/uploads",
  uploadRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/connections",
  connectionRoutes
);

app.use(
  "/api/follows",
  followRoutes
);

app.use(
  "/api/conversations",
  conversationRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

/*
|--------------------------------------------------------------------------
| Invalid JSON Error Handler
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body.",
    });
  }

  next(error);
});

/*
|--------------------------------------------------------------------------
| General Error Handler
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  return res.status(error.status || 500).json({
    success: false,
    message:
      error.message || "Internal server error.",
  });
});

/*
|--------------------------------------------------------------------------
| PORT
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

server.listen(PORT, () => {
  console.log(
    `AlumniConnect server running on port ${PORT}`
  );

  console.log(
    `Socket.IO running on port ${PORT}`
  );
});