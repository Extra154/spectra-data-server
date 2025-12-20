const express = require("express");
const router = express.Router();
const db = require("../firebaseService"); // make sure this exports your Firebase DB

// Add a notification for a user
router.post("/", async (req, res) => {
  const notif = req.body; // expected: { username, notification, timeNot, ... }
  if (!notif.username || !notif.notification) {
    return res.status(400).json({ error: "Missing username or notification" });
  }

  try {
    const ref = db.ref(`notifications/${notif.username}`);
    const newRef = ref.push();
    await newRef.set({
      ...notif,
      timeNot: Date.now() // add current timestamp if not provided
    });
    res.json({ success: true, notificationId: newRef.key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add notification" });
  }
});

// Get all notifications for a user
router.get("/:username", async (req, res) => {
  const username = req.params.username;
  try {
    const snapshot = await db.ref(`notifications/${username}`).once("value");
    res.json(snapshot.val() || {}); // return empty object if no notifications
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

module.exports = router;