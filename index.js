const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const { keys } = require("./credentials");

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

mongoose.connect(keys.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("DB Connected");
});

app.use(morgan("tiny"));

app.get("/api", (req, res) => {
  res.json({
    success: true,
  });
});

app.get("/api/song", (req, res) => {
  res.json({
    success: true,
    hit: "song",
  });
});

app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});
