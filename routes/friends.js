const express = require("express");
const router = express.Router();
const db = require("../firebaseService"); // Firebase Realtime DB instance

/**
 * Add or update a friend
 * Body example:
 * {
 *   "username": "john",
 *   "followers": 120,
 *   "isFollowing": true,
 *   "userProfPic": "url"
 * }
 */
router.post("/", async (req, res) => {
  const friend = req.body;

  if (!friend.username) {
    return res.status(400).json({ error: "Missing username" });
  }

  try {
    await db.ref(`friends/${friend.username}`).set(friend);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save friend" });
  }
});

/**
 * Get friend data by username
 */
router.get("/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const snapshot = await db.ref(`friends/${username}`).once("value");
    res.json(snapshot.val() || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch friend" });
  }
});

module.exports = router;