const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const { keys } = require("./credentials");
const Grid = require("gridfs-stream");
const GridFsStorage = require("multer-gridfs-storage");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.set("view engine", "ejs");
app.use(morgan("tiny"));

mongoose.connect(keys.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const conn = mongoose.connection;

conn.on("connected", () => {
  console.log("DB Connected.");
});

let gfs;
conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "songs",
  });
});

const storage = new GridFsStorage({
  url: keys.MONGO_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "songs",
        };
        resolve(fileInfo);
      });
    });
  },
});

const upload = multer({
  storage,
});

app.get("/api", (req, res) => {
  if (!gfs) {
    console.log("some error occured, check connection to db");
    res.send("some error occured, check connection to db");
    process.exit(0);
  }
  gfs.find().toArray((err, files) => {
    // check if files
    if (!files || files.length === 0) {
      return res.render("main", {
        files: false,
      });
    } else {
      const f = files
        .map((file) => {
          if (file.contentType === "audio/mpeg") {
            file.isSong = true;
            file.isImage = false;
          } else if (file.contentType === "image/jpeg"  || file.contentType === "image/png"){
            file.isImage = true;
            file.isSong = false;
          }
          return file;
        })
        .sort((a, b) => {
          return new Date(b["uploadDate"]).getTime() - new Date(a["uploadDate"]).getTime();
        });

      return res.render("main", {
        files: f,
      });
    }
  });
});

app.post("/api/upload", upload.single("songs"), (req, res) => {
  res.redirect("/api");
});

app.get("/api/songs/:filename", (req, res) => {
  // console.log('id', req.params.id)
  const file = gfs
    .find({
      filename: req.params.filename,
    })
    .toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: "no files exist",
        });
      }
      gfs.openDownloadStreamByName(req.params.filename).pipe(res);
    });
});


app.post("/api/delete/:id", (req, res) => {
    gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
      if (err) return res.status(404).json({ err: err.message });
      res.redirect("/api");
    });
  });

app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});
