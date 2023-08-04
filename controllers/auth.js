const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// see the classic-node-js-server-code-to-know-how-this-works
//this package is for user-input-validation
const { validationResult } = require("express-validator");

exports.signup = (req, res, next) => {
  // validationResult() => see the classic-node-js-server-code-to-know-how-this-works
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    //we are creating this value 'statusCode' on the error object on the fly here same iwth error.data
    error.statusCode = 422;
    error.data = errors.array();
    ///we used 'throw error', since this code is not async, which ends up in the catch block
    //where it is handled if it was async, use next(error)
    throw error;
  }
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  // see the classic-node-js-server-code-to-know-how-this-works
  bcrypt
    .hash(password, 12)
    .then((hashedPw) => {
      const user = new User({
        email: email,
        password: hashedPw,
        name: name,
      });
      return user.save();
    })
    .then((result) => {
      res.status(201).json({ message: "User created", userId: result._id });
    })
    .catch((err) => {
      if (!err.statusCode) {
        //we are creating this value 'statusCode' on the error object on the fly here
        err.statusCode = 500;
      }
      //this error will be handled by the error handling middleware in the app.js file
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const error = new Error("A user with this email could not be found.");
        //we are creating this value 'statusCode' on the error object on the fly here
        error.statusCode = 401;
        //we use 'throw error', since this code is not async, which ends up in the catch block
        //where it is handled if it was async, use next(error)
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong password");
        //we are creating this value 'statusCode' on the error object on the fly here
        err.statusCode = 401;
        //we use 'throw error', since this code is not async, which ends up in the catch block
        //where it is handled if it was async, use next(error)
        throw error;
      }

      //storing userData on the token object
      //'somesupersupersecret': this is user a longer string, in other to make the token generation stronger
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        "somesupersupersecret",
        {
          expiresIn: "1h",
        }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch((err) => {
      if (!err.statusCode) {
        //we are creating this value 'statusCode' on the error object on the fly here
        err.statusCode = 500;
      }
      //this error will be handled by the error handling middleware in the app.js file
      next(err);
    });
};

exports.getUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ status: user.status });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  const newStatus = req.body.status;
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }
    user.status = newStatus;
    await user.save();
    res.status(200).json({ message: 'User updated.' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
