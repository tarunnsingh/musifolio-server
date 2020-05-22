const mongoose = require("mongoose");

const SongSchema = mongoose.Schema({
  song: {
    type: Buffer,
  },
});

SongSchema.methods.toJSON = () => {
  const result = this.toObject();
  delete result.song;
  return result;
};

const Song = mongoose.model("Song", SongSchema);

module.exports = Song;
