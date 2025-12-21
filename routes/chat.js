const express = require("express");
const router = express.Router();
const db = require("../firebaseService"); // Make sure this exports your Firebase DB

// Columns from ChatDatabase
const CHAT_COLUMNS = [
  "id",
  "senderName",
  "recName",
  "username",
  "sentText",
  "receivedText",
  "timeSent",
  "timeReceived",
  "imageSent",
  "imageRec",
  "videoSent",
  "videoRec",
  "audioSent",
  "audioRec",
  "senderPic",
  "recProfPic",
  "eventSend",
  "eventRec",
  "descriptionSend",
  "descriptionRec",
  "eventDateSent",
  "eventDateRec",
  "eventTmSend",
  "eventTmRec"
];

/**
 * POST a single chat message
 */
router.post("/", async (req, res) => {
  const { chatName, message } = req.body;
  if (!chatName || !message) return res.status(400).json({ error: "Missing chatName or message" });

  try {
    const chatRef = db.ref(`chats/${chatName}/messages`);
    const newMsgRef = chatRef.push();

    // Ensure all columns are included
    const dataToPush = {};
    CHAT_COLUMNS.forEach(col => {
      dataToPush[col] = message[col] !== undefined ? message[col] : null;
    });

    await newMsgRef.set(dataToPush);
    res.json({ success: true, messageId: newMsgRef.key });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * GET all messages for a chat
 */
router.get("/:chatName", async (req, res) => {
  const chatName = req.params.chatName;

  try {
    const snapshot = await db.ref(`chats/${chatName}/messages`).once("value");
    const messages = [];
    snapshot.forEach(snap => {
      messages.push({ id: snap.key, ...snap.val() });
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * SYNC chat messages (server → client)
 * - Returns messages with ID > lastLocalId
 * - Creates chat if it does not exist
 */
router.post("/sync", async (req, res) => {
  const { chatName, lastLocalId } = req.body;
  if (!chatName) return res.status(400).json({ error: "Missing chatName" });

  try {
    const chatRef = db.ref(`chats/${chatName}/messages`);
    const snapshot = await chatRef.once("value");

    // If chat does NOT exist → create it
    if (!snapshot.exists()) {
      await chatRef.set({});
      return res.json({ messages: [], created: true });
    }

    // Chat exists → fetch messages with ID > lastLocalId
    const messages = [];
    snapshot.forEach(snap => {
      const msg = snap.val();
      msg.id = snap.key; // Include server ID
      if (parseInt(msg.id) > (lastLocalId || 0)) {
        messages.push(msg);
      }
    });

    res.json({ messages, created: false });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUSH multiple messages (client → server)
 * - Handles all columns from local ChatDatabase
 */
router.post("/push", async (req, res) => {
  const { chatName, messages } = req.body;
  if (!chatName || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing chatName or messages array" });
  }

  try {
    const chatRef = db.ref(`chats/${chatName}/messages`);

    for (const msg of messages) {
      const dataToPush = {};
      CHAT_COLUMNS.forEach(col => {
        dataToPush[col] = msg[col] !== undefined ? msg[col] : null;
      });

      await chatRef.push(dataToPush);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


