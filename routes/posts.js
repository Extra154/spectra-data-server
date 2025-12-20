const express = require("express");
const router = express.Router();
const db = require("../firebaseService");

router.post("/", async (req, res) => {
  const notif = req.body; // {username, notification, timeNot, etc}
  if (!notif.username) return res.status(400).json({ error: "Missing username" });

  try {
    const newRef = db.ref(`notifications/${notif.username}`).push();
    await newRef.set(notif);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:username", async (req, res) => {
  try {
    const snapshot = await db.ref(`notifications/${req.params.username}`).once("value");
    res.json(snapshot.val() || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;