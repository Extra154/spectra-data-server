const express = require("express");
const router = express.Router();
const db = require("../firebaseService");

const STORY_LIFETIME = 24 * 60 * 60 * 1000; // 24 hours

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
    songPlayed
  } = req.body;

  if (!id || !username) {
    return res.status(400).json({ error: "Missing id or username" });
  }

  const createdAt = Date.now(); // 🔥 authoritative server time

  try {
    await db.ref(stories/${id}).set({
      id,
      username,
      profPic,
      videoPosted,
      imagePosted,
      songPosted,
      caption,
      songPlayed,
      likes: 0,
      viewers: [],
      createdAt
    });

    res.json({ success: true, createdAt });
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
    const ref = db.ref(stories/${storyId});
    const snapshot = await ref.once("value");
    const story = snapshot.val();

    if (!story) return res.status(404).json({ error: "Story not found" });

    // ❌ expired → reject
    if (Date.now() - story.createdAt > STORY_LIFETIME) {
      await ref.remove();
      return res.status(410).json({ error: "Story expired" });
    }

    const viewers = story.viewers || [];
    if (!viewers.includes(viewer)) {
      viewers.push(viewer);
      await ref.child("viewers").set(viewers);
    }

    res.json({ success: true, viewers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all valid (non-expired) stories
 */
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.ref("stories").once("value");
    const stories = snapshot.val() || {};
    const now = Date.now();

    const filtered = {};

    for (const id in stories) {
      if (now - stories[id].createdAt <= STORY_LIFETIME) {
        filtered[id] = stories[id];
      } else {
        // 🧹 auto cleanup
        await db.ref(stories/${id}).remove();
      }
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
