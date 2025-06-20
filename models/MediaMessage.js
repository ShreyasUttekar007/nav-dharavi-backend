const mongoose = require("mongoose");
const { Schema } = mongoose;

const MediaMessageSchema = new Schema(
  {
    user: {
      wa_number: { type: String, required: true, trim: true }
    },
    message: { type: String, trim: true },
    type: { type: String, required: true, trim: true },
    media_url: { type: String, required: true, trim: true },
    timestamp: { type: Date, required: true, default: Date.now },
    response: { type: String, trim: true }
  },
  { timestamps: true }
);

const MediaMessage = mongoose.model("MediaMessage", MediaMessageSchema);
module.exports = MediaMessage;
