const express = require("express");
const router = express.Router();
const db = require("../firebaseService"); // admin.database()
const bcrypt = require("bcryptjs");

const ONLINE_TIMEOUT_MS = 60 * 1000; // 1 minute

// -----------------------
// HELPERS
// -----------------------
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function isUserOnline(user) {
  if (!user?.isOnline || !user?.lastSeen) return false;
  return Date.now() - user.lastSeen < ONLINE_TIMEOUT_MS;
}

// -----------------------
// CREATE OR UPDATE USER
// -----------------------
router.post("/", async (req, res) => {
  const incomingUser = req.body;
  if (!incomingUser.username) {
    return res.status(400).json({ error: "Missing username" });
  }

  try {
    const user = { ...incomingUser };

    // Hash password if provided
    if (user.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }

    await db.ref(`users/${user.username}`).update({
      ...user,
      updatedAt: Date.now(),
    });

    res.json({
      success: true,
      user: sanitizeUser(user),
    });
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
    const snapshot = await db
      .ref(`users/${req.params.username}`)
      .once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = snapshot.val();

    res.json({
      ...sanitizeUser(user),
      isOnline: isUserOnline(user),
    });
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
  if (!follower || !followed) {
    return res.status(400).json({ error: "Missing follower/followed" });
  }

  try {
    await db
      .ref(`followers/${follower}/${followed}`)
      .set(Date.now());

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
  if (!follower || !followed) {
    return res.status(400).json({ error: "Missing follower/followed" });
  }

  try {
    await db
      .ref(`followers/${follower}/${followed}`)
      .remove();

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
    const snapshot = await db
      .ref(`followers/${req.params.username}`)
      .once("value");

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
    const followingSnap = await db
      .ref(`followers/${username}`)
      .once("value");

    const following = followingSnap.exists()
      ? Object.keys(followingSnap.val())
      : [];

    const mutuals = [];

    await Promise.all(
      following.map(async (otherUser) => {
        const followsBackSnap = await db
          .ref(`followers/${otherUser}/${username}`)
          .once("value");

        if (followsBackSnap.exists()) {
          const userSnap = await db
            .ref(`users/${otherUser}`)
            .once("value");

          if (userSnap.exists()) {
            const user = userSnap.val();
            mutuals.push({
              ...sanitizeUser(user),
              isOnline: isUserOnline(user),
            });
          }
        }
      })
    );

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
    const followingSnap = await db
      .ref(`followers/${username}`)
      .once("value");

    const following = followingSnap.exists()
      ? Object.keys(followingSnap.val())
      : [];

    const usersSnap = await db.ref("users").once("value");
    const users = usersSnap.exists() ? usersSnap.val() : {};

    const suggestions = Object.keys(users)
      .filter(
        (u) => u !== username && !following.includes(u)
      )
      .map((u) => {
        const user = users[u];
        return {
          ...sanitizeUser(user),
          isOnline: isUserOnline(user),
        };
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

  if (typeof isOnline !== "boolean") {
    return res.status(400).json({ error: "Missing/invalid isOnline" });
  }

  try {
    await db.ref(`users/${username}`).update({
      isOnline,
      lastSeen: Date.now(),
      updatedAt: Date.now(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// -----------------------
// GET STATUS (Ghost-proof)
// -----------------------
router.get("/:username/status", async (req, res) => {
  try {
    const snapshot = await db
      .ref(`users/${req.params.username}`)
      .once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = snapshot.val();

    res.json({
      isOnline: isUserOnline(user),
      lastSeen: user.lastSeen || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

module.exports = router;

