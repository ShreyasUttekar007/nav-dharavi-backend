const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const twilio = require("twilio");
const config = require("../config");
const bcrypt = require("bcrypt");
const MediaMessage = require("../models/MediaMessage");

const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

const router = express.Router();

function generateRandomPassword(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function generateReferralCode(phoneNumber) {
  // Ensure at least 6 digits; handle short numbers gracefully
  let digits = phoneNumber.replace(/\D/g, ""); // Only digits
  if (digits.length < 6) digits = digits.padStart(6, "0");
  return "NAVA" + digits.slice(-6);
}

// ✅ SIGNUP route
router.post("/signup", async (req, res, next) => {
  try {
    const {
      name,
      phoneNumber,
      age,
      photo,
      profession,
      residentOfDharavi,
      socialMediaInfluencer,
      socialMediaInfluencerOn,
      referralCode,
    } = req.body;

    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Auto-generate referral code
    const code = generateReferralCode(phoneNumber);

    const plainPassword = generateRandomPassword(8); // 8 chars
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = new User({
      name,
      phoneNumber,
      age,
      photo,
      code, // use the generated code
      profession,
      residentOfDharavi,
      socialMediaInfluencer,
      socialMediaInfluencerOn,
      referralCode,
      password: hashedPassword,
    });

    await user.save();

    // Send SMS with the password
    await twilioClient.messages.create({
      body: `Welcome to नव धारावी! Your login password is: ${plainPassword}`,
      from: config.twilio.fromPhone,
      to: phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`,
    });

    const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
      expiresIn: "1d",
    });

    res.status(201).json({
      message: "User created and password sent via SMS",
      token,
      code, // send code back if you want to show it to user
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res
        .status(400)
        .json({ message: "Phone number and password are required" });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
      expiresIn: "1d",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        age: user.age,
        photo: user.photo,
        code: user.code,
        profession: user.profession,
        residentOfDharavi: user.residentOfDharavi,
        socialMediaInfluencer: user.socialMediaInfluencer,
        socialMediaInfluencerOn: user.socialMediaInfluencerOn,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1. Generate a new password
    const newPlainPassword = generateRandomPassword(8);

    // 2. Hash the new password
    const hashed = await bcrypt.hash(newPlainPassword, 10);

    // 3. Save hashed password (& plain if you need to send it)
    user.password = hashed;
    // Optionally, if you store plainPassword for SMS
    user.plainPassword = newPlainPassword;
    await user.save();

    // 4. Send SMS with new password
    await twilioClient.messages.create({
      body: `Your new नव धारावी login password is: ${newPlainPassword}`,
      from: config.twilio.fromPhone,
      to: phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`,
    });

    res.status(200).json({
      message: "A new password has been sent to your registered mobile number.",
    });
  } catch (error) {
    next(error);
  }
});

// ✅ GET ALL USERS
router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:userId
router.get("/users/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

router.get("/by-wa-number/:wa_number", async (req, res, next) => {
  try {
    let wa_number = req.params.wa_number;
    if (!wa_number.startsWith("whatsapp:")) {
      // If user supplies only number, add +91 and prefix
      if (/^\d{10}$/.test(wa_number)) {
        wa_number = "whatsapp:+91" + wa_number;
      } else {
        wa_number = "whatsapp:" + wa_number;
      }
    }
    const messages = await MediaMessage.find({
      "user.wa_number": wa_number,
    }).sort({ timestamp: -1 });
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
});

// ✅ UPDATE USER
router.put("/update-user/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { name, phoneNumber, age, photo, code, profession } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update only if provided
    user.name = name || user.name;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.age = age || user.age;
    user.photo = photo || user.photo;
    user.code = code || user.code;
    user.profession = profession || user.profession;

    await user.save();

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    next(error);
  }
});

// Assuming you have bcrypt and User already imported
router.post("/update-password", async (req, res, next) => {
  try {
    const { phoneNumber, oldPassword, newPassword } = req.body;
    if (!phoneNumber || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
});

// ✅ DELETE USER
router.delete("/users/:id", async (req, res, next) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
