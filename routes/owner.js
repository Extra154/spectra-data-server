const express = require("express");
const router = express.Router();
const db = require("../firebaseService");

router.post("/", async (req, res) => {
  const owner = req.body;
  if (!owner.id) return res.status(400).json({ error: "Missing owner ID" });

  try {
    await db.ref(`owner/${owner.id}`).set(owner);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const snapshot = await db.ref(`owner/${req.params.id}`).once("value");
    res.json(snapshot.val() || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;