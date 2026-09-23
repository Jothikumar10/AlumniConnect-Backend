const Connection = require("../models/Connection");
const User = require("../models/User");

// Send connection request
const sendConnectionRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.userId;

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot connect with yourself.",
      });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const existingConnection = await Connection.findOne({
      $or: [
        {
          sender: senderId,
          receiver: receiverId,
        },
        {
          sender: receiverId,
          receiver: senderId,
        },
      ],
    });

    if (existingConnection) {
      return res.status(400).json({
        success: false,
        message: `Connection already exists with status: ${existingConnection.status}.`,
        connection: existingConnection,
      });
    }

    const connection = await Connection.create({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    const populatedConnection = await Connection.findById(
      connection._id
    )
      .populate(
        "sender",
        "name profileImage jobRole company"
      )
      .populate(
        "receiver",
        "name profileImage jobRole company"
      );

    return res.status(201).json({
      success: true,
      message: "Connection request sent successfully.",
      connection: populatedConnection,
    });
  } catch (error) {
    console.error(
      "Send connection request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send connection request.",
      error: error.message,
    });
  }
};

// Get connection status with another user
const getConnectionStatus = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (
      currentUserId.toString() ===
      otherUserId.toString()
    ) {
      return res.status(200).json({
        success: true,
        status: "self",
        direction: null,
        connection: null,
      });
    }

    // Find connection without populate first
    const connection = await Connection.findOne({
      $or: [
        {
          sender: currentUserId,
          receiver: otherUserId,
        },
        {
          sender: otherUserId,
          receiver: currentUserId,
        },
      ],
    });

    // No connection between these users
    if (!connection) {
      return res.status(200).json({
        success: true,
        status: "none",
        direction: null,
        connection: null,
      });
    }

    let direction;

    if (
      connection.sender.toString() ===
      currentUserId.toString()
    ) {
      direction = "sent";
    } else {
      direction = "received";
    }

    // Populate after finding the connection
    const populatedConnection =
      await Connection.findById(connection._id)
        .populate(
          "sender",
          "name profileImage jobRole company"
        )
        .populate(
          "receiver",
          "name profileImage jobRole company"
        );

    return res.status(200).json({
      success: true,
      status: connection.status,
      direction,
      connection: populatedConnection,
    });
  } catch (error) {
    console.error(
      "Get connection status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get connection status.",
      error: error.message,
    });
  }
};

// Accept connection request
const acceptConnectionRequest = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const connectionId = req.params.connectionId;

    const connection = await Connection.findById(
      connectionId
    );

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found.",
      });
    }

    if (
      connection.receiver.toString() !==
      currentUserId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to accept this request.",
      });
    }

    if (connection.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${connection.status}.`,
      });
    }

    connection.status = "accepted";

    await connection.save();

    const populatedConnection =
      await Connection.findById(connection._id)
        .populate(
          "sender",
          "name profileImage jobRole company"
        )
        .populate(
          "receiver",
          "name profileImage jobRole company"
        );

    return res.status(200).json({
      success: true,
      message: "Connection request accepted.",
      connection: populatedConnection,
    });
  } catch (error) {
    console.error(
      "Accept connection request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to accept connection request.",
      error: error.message,
    });
  }
};

// Reject connection request
const rejectConnectionRequest = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const connectionId = req.params.connectionId;

    const connection = await Connection.findById(
      connectionId
    );

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found.",
      });
    }

    if (
      connection.receiver.toString() !==
      currentUserId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to reject this request.",
      });
    }

    if (connection.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request is already ${connection.status}.`,
      });
    }

    connection.status = "rejected";

    await connection.save();

    return res.status(200).json({
      success: true,
      message: "Connection request rejected.",
      connection,
    });
  } catch (error) {
    console.error(
      "Reject connection request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to reject connection request.",
      error: error.message,
    });
  }
};

// Cancel connection request
const cancelConnectionRequest = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const connectionId = req.params.connectionId;

    const connection = await Connection.findById(
      connectionId
    );

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found.",
      });
    }

    if (
      connection.sender.toString() !==
      currentUserId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to cancel this request.",
      });
    }

    if (connection.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending requests can be cancelled.",
      });
    }

    await Connection.findByIdAndDelete(connectionId);

    return res.status(200).json({
      success: true,
      message: "Connection request cancelled.",
    });
  } catch (error) {
    console.error(
      "Cancel connection request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to cancel connection request.",
      error: error.message,
    });
  }
};

// Get incoming pending requests
const getConnectionRequests = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const requests = await Connection.find({
      receiver: currentUserId,
      status: "pending",
    })
      .populate(
        "sender",
        "name profileImage coverImage jobRole company department graduationYear"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error(
      "Get connection requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get connection requests.",
      error: error.message,
    });
  }
};

// Get accepted connections
const getMyConnections = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const connections = await Connection.find({
      $or: [
        {
          sender: currentUserId,
          status: "accepted",
        },
        {
          receiver: currentUserId,
          status: "accepted",
        },
      ],
    })
      .populate(
        "sender",
        "name profileImage jobRole company department"
      )
      .populate(
        "receiver",
        "name profileImage jobRole company department"
      )
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: connections.length,
      connections,
    });
  } catch (error) {
    console.error(
      "Get my connections error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get connections.",
      error: error.message,
    });
  }
};

module.exports = {
  sendConnectionRequest,
  getConnectionStatus,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  getConnectionRequests,
  getMyConnections,
};