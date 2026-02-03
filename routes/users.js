const express = require("express");
const router = express.Router();
const db = require("../firebaseService"); // admin.database()
const bcrypt = require("bcryptjs");

// -----------------------
// CREATE OR UPDATE USER
// -----------------------
router.post("/", async (req, res) => {
  const user = req.body; // Should match UserResponse fields
  if (!user.username) return res.status(400).json({ error: "Missing username" });

  try {
    // Hash password if provided
    if (user.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }

    // Save or update user under users/{username}
    await db.ref(users/${user.username}).update({
      ...user,
      updatedAt: Date.now(), // always update timestamp
    });

    res.json({ success: true, user: { ...user, password: undefined } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create/update user" });
  }
});

// -----------------------
// GET USER BY USERNAME
// -----------------------
router.get("/:username", async (req, res) => {
  try {
    const snapshot = await db.ref(users/${req.params.username}).once("value");
    if (!snapshot.exists()) return res.status(404).json({ error: "User not found" });

    const user = snapshot.val();
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// -----------------------
// FOLLOW A USER
// -----------------------
router.post("/follow", async (req, res) => {
  const { follower, followed } = req.body;
  if (!follower || !followed) return res.status(400).json({ error: "Missing follower/followed" });

  try {
    await db.ref(followers/${follower}/${followed}).set(Date.now());
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Follow failed" });
  }
});

// -----------------------
// UNFOLLOW A USER
// -----------------------
router.post("/unfollow", async (req, res) => {
  const { follower, followed } = req.body;
  if (!follower || !followed) return res.status(400).json({ error: "Missing follower/followed" });

  try {
    await db.ref(followers/${follower}/${followed}).remove();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unfollow failed" });
  }
});

// -----------------------
// GET FOLLOWING FOR USER
// -----------------------
router.get("/:username/following", async (req, res) => {
  try {
    const snapshot = await db.ref(followers/${req.params.username}).once("value");
    res.json(snapshot.val() || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch following" });
  }
});

// -----------------------
// MUTUAL CONTACTS
// -----------------------
router.get("/:username/mutuals", async (req, res) => {
  const username = req.params.username;

  try {
    const followingSnap = await db.ref(followers/${username}).once("value");
    const following = followingSnap.exists() ? Object.keys(followingSnap.val()) : [];

    // Check who follows me back
    const mutuals = [];
    await Promise.all(following.map(async (f) => {
      const theirFollowingSnap = await db.ref(followers/${f}/${username}).once("value");
      if (theirFollowingSnap.exists()) {
        const userSnap = await db.ref(users/${f}).once("value");
        if (userSnap.exists()) {
          const { password, ...safeUser } = userSnap.val();
          mutuals.push(safeUser);
        }
      }
    }));

    res.json(mutuals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch mutual contacts" });
  }
});

// -----------------------
// PEOPLE YOU MAY KNOW (Suggestions)
// -----------------------
router.get("/:username/suggestions", async (req, res) => {
  const username = req.params.username;
  try {
    const followingSnap = await db.ref(followers/${username}).once("value");
    const following = followingSnap.exists() ? Object.keys(followingSnap.val()) : [];

    const usersSnap = await db.ref("users").once("value");
    const users = usersSnap.exists() ? usersSnap.val() : {};

    const suggestions = Object.keys(users)
      .filter(u => u !== username && !following.includes(u))
      .map(u => {
        const { password, ...safeUser } = users[u];
        return safeUser;
      });

    res.json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

// -----------------------
// STATUS HEARTBEAT
// -----------------------
router.post("/:username/status", async (req, res) => {
  const username = req.params.username;
  const { isOnline } = req.body;

  if (typeof isOnline !== "boolean") return res.status(400).json({ error: "Missing/invalid isOnline" });

  try {
    await db.ref(users/${username}).update({
      isOnline: !!isOnline,
      lastSeen: Date.now(), // Timestamp for ghosting prevention
      updatedAt: Date.now()
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// -----------------------
// GET STATUS (including ghosting check)
// -----------------------
router.get("/:username/status", async (req, res) => {
  try {
    const snapshot = await db.ref(users/${req.params.username}).once("value");
    if (!snapshot.exists()) return res.status(404).json({ error: "User not found" });

    const { isOnline, lastSeen, password } = snapshot.val();
    const now = Date.now();
    const online = (isOnline && lastSeen && now - lastSeen < 60_000); // online only if lastSeen < 1 min
    res.json({ isOnline: online, lastSeen });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

module.exports = router;

