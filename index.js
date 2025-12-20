// spectra-data-server/index.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// Import routes
const notificationsRoutes = require("./routes/notifications");
const usersRoutes = require("./routes/users");
const chatRoutes = require("./routes/chat");
const friendsRoutes = require("./routes/friends");
const postsRoutes = require("./routes/posts");
const ownerRoutes = require("./routes/owner");
const storiesRoutes = require("./routes/stories");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/users", usersRoutes);
app.use("/chat", chatRoutes);
app.use("/friends", friendsRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/posts", postsRoutes);
app.use("/owner", ownerRoutes);
app.use("/stories", storiesRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Spectra Data Server running on port " + PORT);
});