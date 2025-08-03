const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    age: {
      type: String,
      trim: true,
    },
    photo: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    profession: {
      type: String,
      trim: true,
    },
    residentOfDharavi: {
      type: String,
      trim: true,
    },
    socialMediaInfluencer: {
      type: String,
      trim: true,
    },
    socialMediaInfluencerOn: {
      type: [String], // Array of strings
      default: [],
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
    },
    referralCode: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin", "moderator"],
    },
    socialMediaLinks: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

module.exports = User;
