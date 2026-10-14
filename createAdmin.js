
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "admin@alumniconnect.com";
    const password = "ChangeThisAdmin123!";

    let admin = await User.findOne({ email });

    if (admin) {
      admin.role = "admin";
      admin.isActive = true;
      await admin.save();

      console.log("Existing user is now an admin.");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);

      admin = await User.create({
        name: "AlumniConnect Admin",
        email,
        password: hashedPassword,
        role: "admin",
        isActive: true,
      });

      console.log("Admin account created successfully.");
      console.log("Temporary password:", password);
    }

    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

createAdmin();
