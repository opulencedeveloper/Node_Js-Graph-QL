const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      //see the class node server to know what ref means
      ref: 'User',
      required: true,
    },
  },
  //adding this will give you a 'createdAt'and 'updatedAt' timeStamps in this collection
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
