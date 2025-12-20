const express = require("express");
const router = express.Router();
const db = require("../firebaseService"); // must export admin.database()

// Create or update a user
router.post("/", async (req, res) => {
  const user = req.body; // Should match SignUpDatabase fields

  if (!user.username) {
    return res.status(400).json({ error: "Missing username" });
  }

  try {
    // Save or update user data under "users/{username}"
    await db.ref(`users/${user.username}`).set(user);

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create/update user" });
  }
});

// Get user by username
router.get("/:username", async (req, res) => {
  const username = req.params.username;

  try {
    const snapshot = await db.ref(`users/${username}`).once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(snapshot.val());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

module.exports = router;