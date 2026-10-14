const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Generate JWT Token
|--------------------------------------------------------------------------
*/

const generateToken = (userId, role) => {
  return jwt.sign(
    {
      id: userId,
      role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/*
|--------------------------------------------------------------------------
| REGISTER USER
|--------------------------------------------------------------------------
| POST /api/auth/register
|
| Public registration allows:
| - Student
| - Alumni
|
| Admin and Faculty cannot be created through public registration.
|--------------------------------------------------------------------------
*/

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "student",

      department = "",
      graduationYear = null,
      college = "",

      jobRole = "",
      company = "",
      location = "",
      skills = [],
      linkedin = "",
      github = "",
      portfolio = "",
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate Required Fields
    |--------------------------------------------------------------------------
    */

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Role
    |--------------------------------------------------------------------------
    |
    | Public registration is allowed only for:
    | student
    | alumni
    |
    | Admin and faculty must be created separately.
    |--------------------------------------------------------------------------
    */

    const cleanRole = String(role).trim().toLowerCase();

    if (!["student", "alumni"].includes(cleanRole)) {
      return res.status(403).json({
        success: false,
        message:
          "Invalid registration role. Only Student and Alumni registration is allowed.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Clean Values
    |--------------------------------------------------------------------------
    */

    const cleanName = String(name).trim();

    const cleanEmail = String(email)
      .trim()
      .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | Validate Name
    |--------------------------------------------------------------------------
    */

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Password
    |--------------------------------------------------------------------------
    */

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 6 characters.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Email
    |--------------------------------------------------------------------------
    */

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Existing User
    |--------------------------------------------------------------------------
    */

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Graduation Year
    |--------------------------------------------------------------------------
    */

    let cleanGraduationYear = null;

    if (
      graduationYear !== null &&
      graduationYear !== ""
    ) {
      const year = Number(graduationYear);

      if (
        !Number.isInteger(year) ||
        year < 1950 ||
        year > new Date().getFullYear() + 10
      ) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid graduation year.",
        });
      }

      cleanGraduationYear = year;
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Alumni Information
    |--------------------------------------------------------------------------
    */

    if (cleanRole === "alumni") {
      if (!String(jobRole).trim()) {
        return res.status(400).json({
          success: false,
          message: "Current job role is required for Alumni.",
        });
      }

      if (!String(company).trim()) {
        return res.status(400).json({
          success: false,
          message: "Company name is required for Alumni.",
        });
      }

      if (!String(location).trim()) {
        return res.status(400).json({
          success: false,
          message: "Current location is required for Alumni.",
        });
      }

      if (
        !Array.isArray(skills) ||
        skills.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "At least one skill is required for Alumni.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Clean Skills
    |--------------------------------------------------------------------------
    */

    const cleanSkills = Array.isArray(skills)
      ? skills
          .map((skill) => String(skill).trim())
          .filter(Boolean)
      : [];

    /*
    |--------------------------------------------------------------------------
    | Hash Password
    |--------------------------------------------------------------------------
    */

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    /*
    |--------------------------------------------------------------------------
    | Create User
    |--------------------------------------------------------------------------
    */

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,

      // IMPORTANT
      // This now saves either "student" or "alumni".
      role: cleanRole,

      department: String(
        department || ""
      ).trim(),

      graduationYear: cleanGraduationYear,

      college: String(
        college || ""
      ).trim(),

      /*
      |--------------------------------------------------------------------------
      | Alumni Professional Information
      |--------------------------------------------------------------------------
      */

      jobRole:
        cleanRole === "alumni"
          ? String(jobRole).trim()
          : "",

      company:
        cleanRole === "alumni"
          ? String(company).trim()
          : "",

      location:
        cleanRole === "alumni"
          ? String(location).trim()
          : "",

      skills:
        cleanRole === "alumni"
          ? cleanSkills
          : [],

      linkedin:
        cleanRole === "alumni"
          ? String(linkedin || "").trim()
          : "",

      github:
        cleanRole === "alumni"
          ? String(github || "").trim()
          : "",

      portfolio:
        cleanRole === "alumni"
          ? String(portfolio || "").trim()
          : "",
    });

    /*
    |--------------------------------------------------------------------------
    | Generate JWT
    |--------------------------------------------------------------------------
    */

    const token = generateToken(
      user._id,
      user.role
    );

    /*
    |--------------------------------------------------------------------------
    | Remove Password
    |--------------------------------------------------------------------------
    */

    const userResponse = user.toObject();

    delete userResponse.password;

    /*
    |--------------------------------------------------------------------------
    | Response Message
    |--------------------------------------------------------------------------
    */

    const message =
      cleanRole === "alumni"
        ? "Alumni account created successfully."
        : "Student account created successfully.";

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message,
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | Duplicate Email
    |--------------------------------------------------------------------------
    */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validation Error
    |--------------------------------------------------------------------------
    */

    if (error.name === "ValidationError") {
      const messages = Object.values(
        error.errors
      ).map((err) => err.message);

      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Server Error
    |--------------------------------------------------------------------------
    */

    return res.status(500).json({
      success: false,
      message: "Failed to create account.",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
| POST /api/auth/login
|
| Students, Alumni, Faculty and Admin can login.
|--------------------------------------------------------------------------
*/

const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate Fields
    |--------------------------------------------------------------------------
    */

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Clean Email
    |--------------------------------------------------------------------------
    */

    const cleanEmail = String(email)
      .trim()
      .toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | Find User
    |--------------------------------------------------------------------------
    */

    const user = await User.findOne({
      email: cleanEmail,
    }).select("+password");

    /*
    |--------------------------------------------------------------------------
    | User Not Found
    |--------------------------------------------------------------------------
    */

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Account Status
    |--------------------------------------------------------------------------
    */

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been deactivated.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Compare Password
    |--------------------------------------------------------------------------
    */

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Generate JWT
    |--------------------------------------------------------------------------
    */

    const token = generateToken(
      user._id,
      user.role
    );

    /*
    |--------------------------------------------------------------------------
    | Remove Password
    |--------------------------------------------------------------------------
    */

    const userResponse =
      user.toObject();

    delete userResponse.password;

    /*
    |--------------------------------------------------------------------------
    | Login Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to login.",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET CURRENT USER
|--------------------------------------------------------------------------
| GET /api/auth/me
|
| Requires protect middleware.
|--------------------------------------------------------------------------
*/

const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error(
      "Get current user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get current user.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};