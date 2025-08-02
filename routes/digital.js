const express = require("express");
const User = require("../models/User");
const Digital = require("../models/DigitalContent");

const router = express.Router();

router.post("/digitalcontent/upload", async (req, res) => {
  try {
    const { phoneNumber, photography, reels, shortFilms } = req.body;

    // Always create a new entry (remove unique constraint from schema if needed!)
    const doc = new Digital({
      phoneNumber,
      photography,
      reels,
      shortFilms,
    });
    await doc.save();

    res.json({ success: true, doc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all digital content for a phone number
router.get("/digitalcontent/by-phone/:phoneNumber", async (req, res) => {
  try {
    const phoneNumber = req.params.phoneNumber;
    // Find all documents with the matching phone number
    const entries = await Digital.find({ phoneNumber }).sort({ createdAt: -1 }); // latest first
    res.json({ success: true, entries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Example assuming you have const User = require("../models/User");
router.get("/digitalcontent/all", async (req, res) => {
  try {
    // Get all digital content entries (latest first)
    const entries = await Digital.find().sort({ createdAt: -1 }).lean();

    // Get all unique phoneNumbers from entries
    const phoneNumbers = [
      ...new Set(entries.map((entry) => entry.phoneNumber)),
    ];

    // Fetch all users matching these phoneNumbers
    const users = await User.find({ phoneNumber: { $in: phoneNumbers } })
      .select("phoneNumber name photo") // fetch only what you need!
      .lean();

    // Map phoneNumber => user
    const userMap = {};
    for (let user of users) {
      userMap[user.phoneNumber] = user;
    }

    // Merge user data into each entry
    const enrichedEntries = entries.map((entry) => {
      const user = userMap[entry.phoneNumber] || {};
      return {
        ...entry,
        name: user.name || `User ${entry.phoneNumber?.slice(-4) || ""}`,
        userPhoto: user.photo || "",
      };
    });

    res.json({ success: true, entries: enrichedEntries });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a specific digital content entry by its MongoDB _id
router.put("/digitalcontent/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Only allow updates to these fields (add/remove as needed)
    const { photography, reels, shortFilms } = req.body;

    const update = {};
    if (photography !== undefined) update.photography = photography;
    if (reels !== undefined) update.reels = reels;
    if (shortFilms !== undefined) update.shortFilms = shortFilms;

    // Find by ID and update
    const updatedDoc = await Digital.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    if (!updatedDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    res.json({ success: true, entry: updatedDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
