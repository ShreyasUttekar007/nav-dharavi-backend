const express = require("express");
const User = require("../models/User");
const Digital = require("../models/DigitalContent");
const Entry = require("../models/Entries");

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
    const raw = req.params.phoneNumber;
    const clean = raw.replace(/\D/g, "").slice(-10);

    // Get Digital model entries
    const digitalEntries = await Digital.find({ phoneNumber: raw })
      .sort({ createdAt: -1 })
      .lean();

    // Get Entry model entries (WhatsApp)
    const waRegex = new RegExp(`whatsapp:\\+91${clean}$`);
    const entryDocs = await Entry.find({ phoneNumber: waRegex })
      .sort({ uploadedAt: -1 })
      .lean();

    const combined = [
      ...digitalEntries.map((e) => ({
        ...e,
        phoneNumber: clean,
        source: "Digital",
        photography: e.photography || "",
        reels: e.reels || "",
        shortFilms: e.shortFilms || "",
      })),
      ...entryDocs.map((e) => ({
        _id: e._id,
        phoneNumber: clean,
        source: "WhatsApp",
        photography: e.Photography || "",
        reels: e.Reels || "",
        shortFilms: e["Short Films"] || "",
        status: e.status || "submitted",
        uploadedAt: e.uploadedAt,
      })),
    ];

    res.json({ success: true, entries: combined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Example assuming you have const User = require("../models/User");
router.get("/digitalcontent/all", async (req, res) => {
  try {
    // Fetch Digital model entries
    const digitalEntries = await Digital.find().sort({ createdAt: -1 }).lean();

    // Fetch Entry model entries
    const entryDocs = await Entry.find().sort({ uploadedAt: -1 }).lean();

    // Combine all phoneNumbers from both models
    const digitalNumbers = digitalEntries.map((e) =>
      e.phoneNumber.replace(/\D/g, "").slice(-10)
    );
    const entryNumbers = entryDocs.map((e) =>
      e.phoneNumber.replace(/\D/g, "").slice(-10)
    );
    const allPhoneNumbers = [...new Set([...digitalNumbers, ...entryNumbers])];

    // Fetch matching users
    const users = await User.find({ phoneNumber: { $in: allPhoneNumbers } })
      .select("phoneNumber name photo")
      .lean();

    // Map phoneNumber => user
    const userMap = {};
    for (let user of users) {
      userMap[user.phoneNumber] = user;
    }

    // Format Digital entries
    const formattedDigital = digitalEntries.map((entry) => {
      const phone = entry.phoneNumber.replace(/\D/g, "").slice(-10);
      const user = userMap[phone] || {};

      return {
        ...entry,
        source: "Digital",
        phoneNumber: phone,
        name: user.name || `User ${phone.slice(-4)}`,
        userPhoto: user.photo || "",
        userId: user._id ? user._id.toString() : "",
        photography: entry.photography || "",
        reels: entry.reels || "",
        shortFilms: entry.shortFilms || "",
        status: entry.status || "submitted",
        createdAt: entry.createdAt || entry.updatedAt || new Date(),
      };
    });

    // Format Entry model entries (WhatsApp uploads)
    const formattedEntry = entryDocs.map((entry) => {
      const phone = entry.phoneNumber.replace(/\D/g, "").slice(-10);
      const user = userMap[phone] || {};

      return {
        _id: entry._id,
        phoneNumber: phone,
        name: user.name || `User ${phone.slice(-4)}`,
        userPhoto: user.photo || "",
        userId: user._id ? user._id.toString() : "",
        photography: entry.Photography || "",
        reels: entry.Reels || "",
        shortFilms: entry["Short Films"] || "",
        status: entry.status || "submitted",
        fileName: entry.fileName || "",
        source: "WhatsApp",
        createdAt: entry.uploadedAt || new Date(),
      };
    });

    // Combine and sort all
    const combined = [...formattedDigital, ...formattedEntry].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({ success: true, entries: combined });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/digitalcontent/approved", async (req, res) => {
  try {
    // 1. Fetch from both models
    const digitalEntries = await Digital.find({ status: "Approved" }).lean();
    const entryEntries = await Entry.find({ status: "Approved" }).lean();

    // 2. Normalize phone numbers
    const normalizePhone = (pn) => pn.replace(/\D/g, "").slice(-10);

    const allNumbers = new Set([
      ...digitalEntries.map((e) => normalizePhone(e.phoneNumber)),
      ...entryEntries.map((e) => normalizePhone(e.phoneNumber)),
    ]);

    // 3. Fetch matching users
    const users = await User.find({
      phoneNumber: { $in: [...allNumbers] },
    })
      .select("phoneNumber name photo")
      .lean();

    const userMap = {};
    for (const user of users) {
      userMap[user.phoneNumber] = user;
    }

    // 4. Format Digital entries (INCLUDE ALL SOCIAL FIELDS)
    const formattedDigital = digitalEntries.map((e) => {
      const num = normalizePhone(e.phoneNumber);
      const user = userMap[num] || {};
      return {
        _id: e._id,
        source: "Digital",
        phoneNumber: num,
        name: user.name || `User ${num.slice(-4)}`,
        userPhoto: user.photo || "",
        photography: e.photography || "",
        reels: e.reels || "",
        shortFilms: e.shortFilms || "",
        status: e.status,
        createdAt: e.createdAt,
        caption: e.caption || "",
        likes: e.likes || 0,
        comments: Array.isArray(e.comments) ? e.comments : [],
      };
    });

    // 5. Format Entry entries (INCLUDE ALL SOCIAL FIELDS)
    const formattedEntries = entryEntries.map((e) => {
      const num = normalizePhone(e.phoneNumber);
      const user = userMap[num] || {};
      return {
        _id: e._id,
        source: "WhatsApp",
        phoneNumber: num,
        name: user.name || `User ${num.slice(-4)}`,
        userPhoto: user.photo || "",
        photography: e.Photography || "",
        reels: e.Reels || "",
        shortFilms: e["Short Films"] || "",
        status: e.status,
        createdAt: e.uploadedAt || e.createdAt,
        caption: e.caption || "",
        likes: e.likes || 0,
        comments: Array.isArray(e.comments) ? e.comments : [],
      };
    });

    // 6. Merge & sort all
    const combined = [...formattedDigital, ...formattedEntries].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({ success: true, entries: combined });
  } catch (error) {
    console.error("Error in /digitalcontent/approved:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a specific digital content entry by its MongoDB _id
router.put("/digitalcontent/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let {
      photography,
      reels,
      shortFilms,
      status,
      caption,
      likeUser,
      likeAction,
      comment,
    } = req.body;

    // 1. Build update objects for both models
    const digitalUpdate = {};
    const entryUpdate = {};

    if (photography !== undefined) {
      digitalUpdate.photography = photography;
      entryUpdate.Photography = photography;
    }
    if (reels !== undefined) {
      digitalUpdate.reels = reels;
      entryUpdate.Reels = reels;
    }
    if (shortFilms !== undefined) {
      digitalUpdate.shortFilms = shortFilms;
      entryUpdate["Short Films"] = shortFilms;
    }
    if (status !== undefined) {
      digitalUpdate.status = status;
      entryUpdate.status = status;
    }
    if (caption !== undefined) {
      digitalUpdate.caption = caption;
      entryUpdate.caption = caption;
    }

    // Flags for atomic like/unlike and comment
    let likeUpdate = null,
      commentUpdate = null;

    if (
      likeUser &&
      typeof likeUser === "string" &&
      (likeAction === "like" || likeAction === "unlike")
    ) {
      likeUpdate =
        likeAction === "like"
          ? { $addToSet: { likes: likeUser } }
          : { $pull: { likes: likeUser } };
    }
    if (
      comment &&
      typeof comment === "object" &&
      comment.name &&
      comment.text
    ) {
      commentUpdate = { $push: { comments: comment } };
    }

    // Update Digital first
    let updatedDoc = null;
    // Normal fields
    if (Object.keys(digitalUpdate).length) {
      updatedDoc = await Digital.findByIdAndUpdate(
        id,
        { $set: digitalUpdate },
        { new: true }
      );
    }
    // Like/unlike
    if (likeUpdate) {
      updatedDoc = await Digital.findByIdAndUpdate(id, likeUpdate, {
        new: true,
      });
    }
    // Comment
    if (commentUpdate) {
      updatedDoc = await Digital.findByIdAndUpdate(id, commentUpdate, {
        new: true,
      });
    }

    // If not found in Digital, try Entry model
    if (!updatedDoc) {
      let entryLikeUpdate = null,
        entryCommentUpdate = null;
      // Map like/comment for Entry fields if structure is different
      if (
        likeUser &&
        typeof likeUser === "string" &&
        (likeAction === "like" || likeAction === "unlike")
      ) {
        entryLikeUpdate =
          likeAction === "like"
            ? { $addToSet: { likes: likeUser } }
            : { $pull: { likes: likeUser } };
      }
      if (
        comment &&
        typeof comment === "object" &&
        comment.name &&
        comment.text
      ) {
        entryCommentUpdate = { $push: { comments: comment } };
      }

      // Normal fields
      if (Object.keys(entryUpdate).length) {
        updatedDoc = await Entry.findByIdAndUpdate(
          id,
          { $set: entryUpdate },
          { new: true }
        );
      }
      // Like/unlike
      if (entryLikeUpdate) {
        updatedDoc = await Entry.findByIdAndUpdate(id, entryLikeUpdate, {
          new: true,
        });
      }
      // Comment
      if (entryCommentUpdate) {
        updatedDoc = await Entry.findByIdAndUpdate(id, entryCommentUpdate, {
          new: true,
        });
      }
    }

    if (!updatedDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    res.json({ success: true, entry: updatedDoc });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /digitalcontent/:id
router.delete("/digitalcontent/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = false;

    // Try deleting from Digital model first
    const digitalResult = await Digital.findByIdAndDelete(id);
    if (digitalResult) {
      deleted = true;
    }

    // If not found in Digital, try deleting from Entry model
    if (!deleted) {
      const entryResult = await Entry.findByIdAndDelete(id);
      if (entryResult) {
        deleted = true;
      }
    }

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found." });
    }

    res.json({ success: true, message: "Entry deleted successfully." });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET metrics summary (total users, total posts, approved posts)
router.get("/digitalcontent/metrics", async (req, res) => {
  try {
    // 1. Fetch all posts from both models
    const [digitalEntries, entryDocs] = await Promise.all([
      Digital.find().lean(),
      Entry.find().lean(),
    ]);

    // 2. All unique phone numbers (across both models)
    const digitalNumbers = digitalEntries.map(e => e.phoneNumber.replace(/\D/g, "").slice(-10));
    const entryNumbers = entryDocs.map(e => e.phoneNumber.replace(/\D/g, "").slice(-10));
    const allNumbers = new Set([...digitalNumbers, ...entryNumbers]);

    // 3. Total users
    const totalUsers = allNumbers.size;

    // 4. Total posts
    const totalPosts = digitalEntries.length + entryDocs.length;

    // 5. Total approved posts
    const approvedDigital = digitalEntries.filter(e => e.status === "Approved").length;
    const approvedEntries = entryDocs.filter(e => e.status === "Approved").length;
    const totalApprovedPosts = approvedDigital + approvedEntries;

    res.json({
      success: true,
      metrics: {
        totalUsers,
        totalPosts,
        totalApprovedPosts,
      },
    });
  } catch (error) {
    console.error("Metrics error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});


module.exports = router;
