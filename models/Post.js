const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "video", "audio", "document"],
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    options: [
      {
        text: {
          type: String,
          trim: true,
          maxlength: 200,
        },

        votes: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    company: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    location: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    experience: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    date: {
      type: String,
    },

    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    type: {
      type: String,
      enum: [
        "post",
        "career",
        "job",
        "achievement",
        "event",
        "poll",
      ],
      default: "post",
    },

    media: {
      type: [mediaSchema],
      default: [],
    },

    link: {
      type: String,
      trim: true,
      default: null,
    },

    hashtags: {
      type: [String],
      default: [],
    },

    mentions: {
      type: [String],
      default: [],
    },

    poll: {
      type: pollSchema,
      default: null,
    },

    job: {
      type: jobSchema,
      default: null,
    },

    event: {
      type: eventSchema,
      default: null,
    },

    likes: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },

    comments: {
      type: Number,
      default: 0,
      min: 0,
    },

    shares: {
      type: Number,
      default: 0,
      min: 0,
    },

    savedBy: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ["published", "pending", "rejected"],
      default: "published",
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ createdAt: -1 });

postSchema.index({
  hashtags: 1,
});

postSchema.index({
  type: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Post", postSchema);