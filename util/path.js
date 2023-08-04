//This file is used to contsruct an absolute path to the parent(root) directory
//to ensure this path works on all OS, even the server runs on an OS
const path = require('path');

module.exports = path.dirname(require.main.filename);