const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommentSchema = new Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  postedAt: { type: Date, default: Date.now },
});

const EntrySchema = new Schema(
  {
    phoneNumber: { type: String, required: true, trim: true },
    Photography: { type: String, trim: true, default: null },
    Reels: { type: String, trim: true, default: null },
    ShortFilms: { type: String, trim: true, default: null },
    fileName: { type: String, trim: true },
    status: {
      type: String,
      enum: ["submitted", "approved", "rejected"],
      default: "submitted",
    },
    chatHistory: { type: [Schema.Types.Mixed], default: [] },

    // 👇 NEW FIELDS
    caption: { type: String, default: "" },
    likes: [{ type: String, trim: true }],
    comments: { type: [CommentSchema], default: [] },

    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Entry = mongoose.model("entrie", EntrySchema);
module.exports = Entry;
