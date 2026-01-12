const express = require("express");
const router = express.Router();
const db = require("../firebaseService");

// LIKE
router.post("/like/:postId", async (req, res) => {
  try {
    const ref = db.ref(posts/${req.params.postId}/likes);
    await ref.transaction(v => (v || 0) + 1);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DISLIKE
router.post("/dislike/:postId", async (req, res) => {
  try {
    const ref = db.ref(posts/${req.params.postId}/dislikes);
    await ref.transaction(v => (v || 0) + 1);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// COMMENT
router.post("/comment/:postId", async (req, res) => {
  const { username, comment, time } = req.body;
  try {
    const ref = db.ref(comments/${req.params.postId}).push();
    await ref.set({ username, comment, time });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
