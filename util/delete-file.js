const fs = require("fs");
const path = require('path');

const deleteImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  //unlink() is used to delete a file
  fs.unlink(filePath, (err) => console.log(err));
};

exports.deleteImage = deleteImage;


