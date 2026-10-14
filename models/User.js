const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Basic Information
    |--------------------------------------------------------------------------
    */

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    /*
    |--------------------------------------------------------------------------
    | User Role
    |--------------------------------------------------------------------------
    */

    role: {
      type: String,
      enum: ["student", "alumni", "faculty", "admin"],
      default: "student",
    },

    /*
    |--------------------------------------------------------------------------
    | Profile Images
    |--------------------------------------------------------------------------
    */

    profileImage: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Personal Information
    |--------------------------------------------------------------------------
    */

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | College / Education Information
    |--------------------------------------------------------------------------
    */

    degree: {
      type: String,
      trim: true,
      default: "",
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    college: {
      type: String,
      trim: true,
      default: "",
    },

    graduationYear: {
      type: Number,
      default: null,
    },

    cgpa: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },

    educationDetails: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Professional Information
    |--------------------------------------------------------------------------
    */

    company: {
      type: String,
      trim: true,
      default: "",
    },

    jobRole: {
      type: String,
      trim: true,
      default: "",
    },

    experience: {
      type: String,
      trim: true,
      default: "",
    },

    industry: {
      type: String,
      trim: true,
      default: "",
    },

    employmentType: {
      type: String,
      enum: [
        "",
        "Full-time",
        "Part-time",
        "Internship",
        "Freelance",
        "Self-employed",
        "Contract",
        "Not Working",
      ],
      default: "",
    },

    careerStatus: {
      type: String,
      enum: [
        "",
        "Working",
        "Open to Opportunities",
        "Looking for Job",
        "Student",
        "Entrepreneur",
        "Not Working",
      ],
      default: "",
    },

    previousCompany: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Skills
    |--------------------------------------------------------------------------
    */

    skills: {
      type: [String],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | Achievements & Certifications
    |--------------------------------------------------------------------------
    */

    achievements: {
      type: [String],
      default: [],
    },

    certifications: {
      type: [String],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | Career Guidance
    |--------------------------------------------------------------------------
    */

    mentorshipAvailable: {
      type: Boolean,
      default: false,
    },

    referralsAvailable: {
      type: Boolean,
      default: false,
    },

    mentorshipAreas: {
      type: [String],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | Social Profiles
    |--------------------------------------------------------------------------
    */

    linkedin: {
      type: String,
      trim: true,
      default: "",
    },

    github: {
      type: String,
      trim: true,
      default: "",
    },

    portfolio: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Additional Profile Information
    |--------------------------------------------------------------------------
    */

    languages: {
      type: [String],
      default: [],
    },

    interests: {
      type: [String],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | Resume
    |--------------------------------------------------------------------------
    */

    resumeUrl: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Account Status
    |--------------------------------------------------------------------------
    */

    isActive: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

userSchema.index({
  name: 1,
});

userSchema.index({
  role: 1,
});

userSchema.index({
  department: 1,
});

userSchema.index({
  graduationYear: 1,
});

userSchema.index({
  company: 1,
});

userSchema.index({
  jobRole: 1,
});

userSchema.index({
  industry: 1,
});

userSchema.index({
  careerStatus: 1,
});

/*
|--------------------------------------------------------------------------
| Model
|--------------------------------------------------------------------------
*/

module.exports = mongoose.model("User", userSchema);