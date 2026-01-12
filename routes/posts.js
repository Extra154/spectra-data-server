const express = require("express");
const router = express.Router();
const db = require("../firebaseService");
const admin = require("firebase-admin");

/* ---------------- CREATE / UPDATE POST ---------------- */
router.post("/", async (req, res) => {
  try {
    const {
      postId,
      username,
      caption,
      mediaUrl,
      mediaType
    } = req.body;

    if (!username || !mediaUrl || !mediaType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const postRef = postId
      ? db.ref(posts/${postId})
      : db.ref("posts").push();

    const snapshot = await postRef.once("value");

    const postData = {
      username,
      caption: caption || "",
      mediaUrl,
      mediaType,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    if (!snapshot.exists()) {
      postData.createdAt = admin.database.ServerValue.TIMESTAMP;
      postData.likeNum = 0;
      postData.dislikeNum = 0;
      postData.commentNum = 0;
      postData.viewCount = 0;
    }

    await postRef.update(postData);

    res.json({ success: true, postId: postRef.key });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- GET POSTS (PAGINATION) ---------------- */
router.get("/", async (req, res) => {
  try {
    const { lastCreatedAt } = req.query;

    let query = db.ref("posts")
      .orderByChild("createdAt")
      .limitToLast(21);

    if (lastCreatedAt) {
      query = query.endAt(Number(lastCreatedAt));
    }

    const snap = await query.once("value");
    let posts = [];

    snap.forEach(child => {
      posts.push({ id: child.key, ...child.val() });
    });

    posts.sort((a, b) => b.createdAt - a.createdAt);

    if (lastCreatedAt) posts.shift();

    res.json(posts.slice(0, 20));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- LIKE TOGGLE ---------------- */
router.post("/like/:postId", async (req, res) => {
  const { userId } = req.body;
  const { postId } = req.params;

  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const userLikeRef = db.ref(postLikes/${postId}/${userId});
    const snap = await userLikeRef.once("value");

    let update = {};
    if (snap.exists()) {
      // Unlike
      update[posts/${postId}/likeNum] = admin.database.ServerValue.increment(-1);
      update[postLikes/${postId}/${userId}] = null;
      await db.ref().update(update);
      res.json({ success: true, liked: false });
    } else {
      // Like
      update[posts/${postId}/likeNum] = admin.database.ServerValue.increment(1);
      update[postLikes/${postId}/${userId}] = true;
      await db.ref().update(update);
      res.json({ success: true, liked: true });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- DISLIKE TOGGLE ---------------- */
router.post("/dislike/:postId", async (req, res) => {
  const { userId } = req.body;
  const { postId } = req.params;

  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const userDislikeRef = db.ref(postDislikes/${postId}/${userId});
    const snap = await userDislikeRef.once("value");

    let update = {};
    if (snap.exists()) {
      // Remove dislike
      update[posts/${postId}/dislikeNum] = admin.database.ServerValue.increment(-1);
      update[postDislikes/${postId}/${userId}] = null;
      await db.ref().update(update);
      res.json({ success: true, disliked: false });
    } else {
      // Add dislike
      update[posts/${postId}/dislikeNum] = admin.database.ServerValue.increment(1);
      update[postDislikes/${postId}/${userId}] = true;
      await db.ref().update(update);
      res.json({ success: true, disliked: true });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- VIEW COUNT (UNIQUE USER) ---------------- */
router.post("/view/:postId", async (req, res) => {
  const { userId } = req.body;
  const { postId } = req.params;

  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const viewRef = db.ref(postViews/${postId}/${userId});
    const snap = await viewRef.once("value");

    if (!snap.exists()) {
      await viewRef.set(true);
      await db.ref(posts/${postId}/viewCount)
        .transaction(v => (v || 0) + 1);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- COMMENT ---------------- */
router.post("/comment/:postId", async (req, res) => {
  const { username, comment } = req.body;
  const { postId } = req.params;

  if (!username || !comment) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const ref = db.ref(comments/${postId}).push();

    await ref.set({
      username,
      comment,
      time: admin.database.ServerValue.TIMESTAMP
    });

    await db.ref(posts/${postId}/commentNum)
      .transaction(v => (v || 0) + 1);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- DELETE POST (ATOMIC) ---------------- */
router.delete("/:postId", async (req, res) => {
  const { postId } = req.params;

  if (!postId) return res.status(400).json({ error: "Missing postId" });

  try {
    const updates = {};
    updates[posts/${postId}] = null;
    updates[comments/${postId}] = null;
    updates[postLikes/${postId}] = null;
    updates[postDislikes/${postId}] = null;
    updates[postViews/${postId}] = null;

    await db.ref().update(updates);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
