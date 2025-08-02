const mongoose = require("mongoose");
const { Schema } = mongoose;

const DigitalSchema = new Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    photography: { type: String, trim: true },
    reels: { type: String, trim: true },
    shortFilms: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Approved", "Not Approved"],
      default: "Not Approved",
    },
  },
  { timestamps: true }
);

const Digital = mongoose.model("digitalcontent", DigitalSchema);

module.exports = Digital;
