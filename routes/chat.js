const express = require("express");
const router = express.Router();
const db = require("../firebaseService"); // Make sure this exports your Firebase DB

// POST a new chat message
router.post("/", async (req, res) => {
  const { chatId, message } = req.body; // chatId = chat table / conversation ID
  if (!chatId || !message) return res.status(400).json({ error: "Missing chatId or message" });

  try {
    const chatRef = db.ref(`chat/${chatId}`); // Template literal with backticks
    const newMsgRef = chatRef.push(); // Push a new message
    await newMsgRef.set(message);
    res.json({ success: true, messageId: newMsgRef.key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// GET all messages from a chat
router.get("/:chatId", async (req, res) => {
  const chatId = req.params.chatId;
  try {
    const snapshot = await db.ref(`chat/${chatId}`).once("value");
    res.json(snapshot.val() || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});


module.exports = router;

router.post("/sync", async (req, res) => {
  const { chatName, lastLocalTime } = req.body;

  if (!chatName) {
    return res.status(400).json({ error: "Missing chatName" });
  }

  try {
    const chatRef = db.ref(chats/${chatName});
    const snapshot = await chatRef.once("value");

    // 1️⃣ If chat does NOT exist → create it
    if (!snapshot.exists()) {
      await chatRef.set({ messages: {} });
      return res.json({ messages: [], created: true });
    }

    // 2️⃣ Chat exists → fetch newer messages
    const msgSnap = await chatRef
      .child("messages")
      .orderByChild("time")
      .startAfter(lastLocalTime || 0)
      .once("value");

    const messages = [];
    msgSnap.forEach(snap => {
      messages.push({ id: snap.key, ...snap.val() });
    });

    res.json({ messages, created: false });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
