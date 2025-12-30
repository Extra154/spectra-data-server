const express = require("express");
const router = express.Router();
const db = require("../firebaseService");

/**
 * FOLLOW USER
 * POST /friends/follow
 * Body:
 * {
 *   "follower": "john",
 *   "target": "mary",
 *   "followerPic": "url",
 *   "targetPic": "url"
 * }
 */
router.post("/follow", async (req, res) => {
  const { follower, target, followerPic, targetPic } = req.body;

  if (!follower || !target) {
    return res.status(400).json({ error: "Missing follower or target" });
  }

  try {
    const now = Date.now();

    // john -> following -> mary
    await db.ref(`friends/${follower}/following/${target}`).set({
      profPic: targetPic || "",
      followedAt: now
    });

    // mary -> followers -> john
    await db.ref(`friends/${target}/followers/${follower}`).set({
      profPic: followerPic || "",
      followedAt: now
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to follow user" });
  }
});

/**
 * UNFOLLOW USER
 * POST /friends/unfollow
 */
router.post("/unfollow", async (req, res) => {
  const { follower, target } = req.body;

  try {
    await db.ref(`friends/${follower}/following/${target}`).remove();
    await db.ref(`friends/${target}/followers/${follower}`).remove();

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
});

/**
 * GET FOLLOWING LIST
 * GET /friends/:username/following
 */
router.get("/:username/following", async (req, res) => {
  try {
    const snap = await db
      .ref(`friends/${req.params.username}/following`)
      .once("value");

    res.json(snap.val() || {});
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch following" });
  }
});

/**
 * GET FOLLOWERS LIST
 * GET /friends/:username/followers
 */
router.get("/:username/followers", async (req, res) => {
  try {
    const snap = await db
      .ref(`friends/${req.params.username}/followers`)
      .once("value");

    res.json(snap.val() || {});
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch followers" });
  }
});

/**
 * CHECK IF FOLLOWING
 * GET /friends/:username/isFollowing/:target
 */
router.get("/:username/isFollowing/:target", async (req, res) => {
  try {
    const snap = await db
      .ref(`friends/${req.params.username}/following/${req.params.target}`)
      .once("value");

    res.json({ isFollowing: snap.exists() });
  } catch (err) {
    res.status(500).json({ error: "Check failed" });
  }
});

module.exports = router;
