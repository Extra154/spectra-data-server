const express = require("express");
const router = express.Router();
const db = require("../firebaseService");

/**
 * Add / update a story
 */
router.post("/", async (req, res) => {
  const {
    id,
    username,
    profPic,
    videoPosted,
    imagePosted,
    songPosted,
    caption,
    time,
    songPlayed,
    likes
  } = req.body;

  if (!id || !username) {
    return res.status(400).json({ error: "Missing id or username" });
  }

  try {
    await db.ref(stories/${id}).set({
      id,
      username,
      profPic,
      videoPosted,
      imagePosted,
      songPosted,
      caption,
      time,
      songPlayed,
      likes: likes || 0,
      viewers: []   // 👈 initialize viewers
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Add viewer to a story
 */
router.post("/view", async (req, res) => {
  const { storyId, viewer } = req.body;

  if (!storyId || !viewer) {
    return res.status(400).json({ error: "Missing storyId or viewer" });
  }

  try {
    const viewersRef = db.ref(stories/${storyId}/viewers);
    const snapshot = await viewersRef.once("value");

    let viewers = snapshot.val() || [];

    if (!viewers.includes(viewer)) {
      viewers.push(viewer);
      await viewersRef.set(viewers);
    }

    res.json({ success: true, viewers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all stories
 */
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.ref("stories").once("value");
    res.json(snapshot.val() || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

