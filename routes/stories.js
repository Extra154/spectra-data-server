const express = require("express");
const router = express.Router();
const db = require("../firebaseService");

// Add a story
router.post("/", async (req, res) => {
  const story = req.body;
  if (!story.id) return res.status(400).json({ error: "Missing story ID" });

  try {
    await db.ref(`stories/${story.id}`).set(story);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all stories
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.ref("stories").once("value");
    res.json(snapshot.val() || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;