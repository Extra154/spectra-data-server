const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../firebaseService"); // admin.database()

/* =====================================================
   HELPER: REMOVE SENSITIVE FIELDS
   ===================================================== */
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

/* =====================================================
   CREATE / UPDATE USER
   ===================================================== */
router.post("/", async (req, res) => {
  const user = req.body;

  if (!user.username || !user.password) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  try {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const userData = {
      ...user,
      password: hashedPassword,
      isOnline: !!user.isOnline,
      updatedAt: Date.now()
    };

    await db.ref(users/${user.username}).set(userData);
    res.json({ success: true, user: sanitizeUser(userData) });
  } catch (err) {
    console.error("USER SAVE ERROR:", err);
    res.status(500).json({ error: "Failed to create/update user" });
  }
});

/* =====================================================
   GET USER BY USERNAME (SAFE)
   ===================================================== */
router.get("/:username", async (req, res) => {
  try {
    const snapshot = await db.ref(users/${req.params.username}).once("value");
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(sanitizeUser(snapshot.val()));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

/* =====================================================
   FOLLOW USER
   ===================================================== */
router.post("/follow", async (req, res) => {
  const { follower, followed } = req.body;

  if (!follower || !followed || follower === followed) {
    return res.status(400).json({ error: "Invalid follow request" });
  }

  try {
    await db.ref(followers/${follower}/${followed}).set(Date.now());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Follow failed" });
  }
});

/* =====================================================
   UNFOLLOW USER
   ===================================================== */
router.post("/unfollow", async (req, res) => {
  const { follower, followed } = req.body;

  try {
    await db.ref(followers/${follower}/${followed}).remove();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Unfollow failed" });
  }
});

/* =====================================================
   CHECK FOLLOW STATUS
   ===================================================== */
router.get("/isFollowing/:follower/:followed", async (req, res) => {
  const { follower, followed } = req.params;

  try {
    const snap = await db.ref(followers/${follower}/${followed}).once("value");
    res.json({ isFollowing: snap.exists() });
  } catch (err) {
    res.status(500).json({ error: "Failed to check follow status" });
  }
});

/* =====================================================
   MUTUAL CONTACTS (SANITIZED)
   ===================================================== */
router.get("/:username/mutual", async (req, res) => {
  const myUsername = req.params.username;

  try {
    const myFollowingSnap = await db.ref(followers/${myUsername}).once("value");
    const myFollowing = myFollowingSnap.val() || {};
    const followingList = Object.keys(myFollowing);

    const mutualChecks = followingList.map(async user => {
      const mutualSnap = await db.ref(followers/${user}/${myUsername}).once("value");
      if (!mutualSnap.exists()) return null;

      const profileSnap = await db.ref(users/${user}).once("value");
      return profileSnap.exists()
        ? sanitizeUser(profileSnap.val())
        : null;
    });

    const results = (await Promise.all(mutualChecks)).filter(Boolean);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch mutual contacts" });
  }
});

/* =====================================================
   BASIC SUGGESTIONS (SANITIZED)
   ===================================================== */
router.get("/:username/suggestions", async (req, res) => {
  const myUsername = req.params.username;

  try {
    const usersSnap = await db.ref("users").once("value");
    const followingSnap = await db.ref(followers/${myUsername}).once("value");

    const users = usersSnap.val() || {};
    const following = followingSnap.val() || {};

    const suggestions = Object.keys(users)
      .filter(u => u !== myUsername && !following[u])
      .map(u => sanitizeUser(users[u]));

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

/* =====================================================
   ADVANCED SUGGESTIONS (FRIENDS OF FRIENDS)
   SANITIZED + PARALLELIZED
   ===================================================== */
router.get("/:username/suggestions/advanced", async (req, res) => {
  const myUsername = req.params.username;

  try {
    const myFollowingSnap = await db.ref(followers/${myUsername}).once("value");
    const myFollowing = myFollowingSnap.val() || {};
    const followingList = Object.keys(myFollowing);

    const followerSnaps = await Promise.all(
      followingList.map(user =>
        db.ref(followers/${user}).once("value")
      )
    );

    const suggestionSet = new Set();

    followerSnaps.forEach(snap => {
      const data = snap.val() || {};
      Object.keys(data).forEach(candidate => {
        if (candidate !== myUsername && !myFollowing[candidate]) {
          suggestionSet.add(candidate);
        }
      });
    });

    const userSnaps = await Promise.all(
      [...suggestionSet].map(u =>
        db.ref(users/${u}).once("value")
      )
    );

    const suggestions = userSnaps
      .filter(s => s.exists())
      .map(s => sanitizeUser(s.val()));

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch advanced suggestions" });
  }
});

/* =====================================================
   UPDATE ONLINE STATUS
   ===================================================== */
router.post("/status", async (req, res) => {
  const { username, isOnline } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Missing username" });
  }

  try {
    await db.ref(users/${username}/isOnline).set(!!isOnline);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

module.exports = router;
