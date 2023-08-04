const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "What's  on your mind!",
  },
  posts: [
    {
      type: Schema.Types.ObjectId,
      //see the classic node server to know what ref means
      ref: "Post",
    },
  ],
});

module.exports = mongoose.model("User", userSchema);