// digitalcontent.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommentSchema = new Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  postedAt: { type: Date, default: Date.now },
});

const DigitalSchema = new Schema(
  {
    phoneNumber: { type: String, required: true, trim: true },
    photography: { type: String, trim: true },
    reels: { type: String, trim: true },
    shortFilms: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Approved", "Not Approved"],
      default: "Not Approved",
    },
    caption: { type: String, maxlength: 300 },
    likes: [{ type: String, trim: true }],
    comments: { type: [CommentSchema], default: [] },
  },
  { timestamps: true }
);

const Digital = mongoose.model("digitalcontent", DigitalSchema);
module.exports = Digital;
