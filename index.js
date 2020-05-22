const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const Grid = require("gridfs-stream");
const GridFsStorage = require("multer-gridfs-storage");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { keys } = require("./credentials");

const PORT = process.env.PORT || 3000;
const app = express();

mongoose.connect(keys.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


const conn = mongoose.connection;
let gfs = ''
conn.on("connected", () => {
  gfs = Grid((db = conn.db), (mongo = mongoose.mongo));
  console.log("DB Connected.")
})


app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));

app.set("view engine", "ejs");

const storage = GridFsStorage({
  gfs: gfs,
  url: keys.MONGO_URI,
  filename: (req, file, cb) => {
    const datetimestamp = Date.now();
    cb(
      null,
      file.filename + "-" + datetimestamp + "." + file.originalname.split(".")[file.originalname.split(".").length - 1]
    );
  },
  metadata: (req, file, cb) => {
    cb(null, { originalname: file.originalname });
  },
  root: "ctFiles",
});

const upload = multer({
  storage: storage,
}).single("song");

app.post("/api/upload", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.json({ error_code: 1, err_desc: err });
      return;
    }
    res.json({ error_code: 0, err_desc: null });
  });
});

app.get('/file/:filename', function(req, res){
  gfs.collection('ctFiles'); //set collection name to lookup into

  /** First check if file exists */
  gfs.files.find({filename: req.params.filename}).toArray(function(err, files){
      if(!files || files.length === 0){
          return res.status(404).json({
              responseCode: 1,
              responseMessage: "error"
          });
      }
      /** create read stream */
      var readstream = gfs.createReadStream({
          filename: files[0].filename,
          root: "ctFiles"
      });
      /** set the proper content type */
      res.set('Content-Type', files[0].contentType)
      /** return response */
      return readstream.pipe(res);
  });
});


// const upload = multer({
//   limits: {
//     fileSize: 15000000, // max file size 1MB = 1000000 bytes
//   },
//   fileFilter(req, file, cb) {
//     if (!file.originalname.match(/\.(mp3|wav)$/)) {
//       cb(new Error("Only upload files with mp3 or wav format."));
//     }
//     cb(undefined, true); // continue with upload
//   },
// });

// app.post("/api/upload", (req, res) => {
//   try {
//     const song = new Song(req.body);
//     const file = req.file.buffer;
//     song.song = file;
//     await song.save((error, doc) => {
//       if (error) return console.log("cannot upload");
//     });
//     return res.status(201).send({ _id: song._id });
//   } catch (error) {
//     res.status(500).send({
//       upload_error: "Error while uploading file...Try again later.",
//     });
//   }
// });

app.get("/api", (req, res) => {
  res.render("index");
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
