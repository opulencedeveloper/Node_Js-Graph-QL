const bcrypt = require("bcryptjs");
//this package is what express-validator is using, I just want to let you know
const validator = require("validator");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Post = require("../models/post");
const { deleteImage } = require("../util/delete-file");

module.exports = {
  //this function is named createUser because we named it createUser in the schema file
  //the value in the argument must also match the one in the schema file, 'req' is passed in by default
  createUser: async function ({ userInput }, req) {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: "Email is invalid" });
    }
    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    ) {
      errors.push({ message: "Password too short!" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      //error.data => we are adding a data field to the error object and giving it a value
      error.data = errors;
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 422;
      //this will give a response to the user with a error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error("User already exists!");
      throw error;
    }
    const hashedPw = await bcrypt.hash(userInput.password, 12);
    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPw,
    });
    const createdUser = await user.save();
    //'_doc' means that it will contain only the userData without all the meta data that moogoose will add like 'findOne()'
    //what you return here must match what you are returning in the schema
    return { ...createdUser._doc, id: createdUser._id.toString() };
  },

  //this function is named login because we named it login in the schema file
  //the value in the argument must also match the one in the schema file, 'req' is passed in by default
  login: async function ({ email, password }) {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 401;
      //this will give a response to the user with a error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password is incorrect");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 401;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    //see the classic node server to know what jwt.sign does
    //here we stored the userId and email in the token too
    //which also helps to encrypt the token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      "somesupersecretkeywords",
      { expiresIn: "1h" }
    );
    //what you return here must match what you are returning in the schema
    return { token: token, userId: user._id.toString() };
  },

  //this function is named createPost because we named it createPost in the schema file
  //the value in the argument must also match the one in the schema file, 'req' is passed in by default
  createPost: async function ({ postInput }, req) {
    //we stored the value of 'isAuth' in the req object, in the auth.js file, in the middleware folder
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 401;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid" });
    }
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      //error.data => we are adding a data field to the error object and giving it a value
      error.data = errors;
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 422;
      //this will give a response to the user with a error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    //we stored the userId in the token when we logged in and assigned a token, which we extract
    //the userId from the token in the auth.js file in the middleware folder
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid user");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 401;
      //this will give a response to the user with a error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    });
    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();
    //'_doc' means that it will contain only the userData without all the meta data that moogoose will add like 'findOne()'
    //what you return here must match what you are returning in the schema
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },

  //this function is named posts because we named it posts in the schema file
  //the value in the argument must also match the one in the schema file, 'req' is passed in by default
  //pagination was implemented here
  posts: async function ({ page }, req) {
    //we stored the value of 'isAuth' in the req object, in the auth.js file, in the middleware folder
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 401;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    if (!page) {
      page = 1;
    }
    const itemsPerPage = 2;
    const totalPosts = await Post.find().countDocuments();
    //'-1' means we are sorting in descending order
    //'createdAt' is a field in the post collection, we are sorting he post with it
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      //see classic node server to know how this works
      //if the result of skip was 5, and the total items 'find()' returns was 10
      //skip will skip the first 5 items and return the rest
      .skip((page - 1) * itemsPerPage)
      //limit() this limites the result of skip, if the value passed to limit was 3
      //only the first 5 items returned by skip will be returned
      .limit(itemsPerPage)
      //since the key 'creator' only holds the id of the user in the post collection, populute takes that user id stored in 'creator'
      //field and includes all the creator raw data here
      .populate("creator");

    //'_doc' means that it will contain only the userData without all the meta data that moogoose will add like 'findOne()'
    //what you return here must match what you are returning in the schema, that why we used '.map()'
    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },

  //this function is named post because we named it post in the schema file
  //the value in the argument must also match the one in the schema file, 'req' is passed in by default
  post: async function ({ id }, req) {
    //we stored the value of 'isAuth' in the req object, in the auth.js file, in the middleware folder
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 401;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }

    //populate() takes the id, which is stored with the 'creator' field in the post collection
    //to fetch all the user data with that id, and populate it here, instead of just the id
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 404;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }

    //'_doc' means that it will contain only the userData without all the meta data that moogoose will add like 'findOne()'
    //what you return here must match what you are returning in the schema
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  //this function is named updatePost because we named it updatePost in the schema file
  //the value in the argument must also match the one in the schema file, 'req' is passed in by default
  updatePost: async function ({ id, postInput }, req) {
    //we stored the value of 'isAuth' in the req object, in the auth.js file, in the middleware folder
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 401;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    //populate() takes the id, which is stored with the 'creator' field in the post collection
    //to fetch all the user data with that id, and populate it here, instead of just the id
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("No post found");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 404;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 403;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    const errors = [];
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid" });
    }
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      //error.data => we are adding a data field to the error object and giving it a value
      error.data = errors;
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 422;
      //this will give a response to the user with a error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    post.title = postInput.title;
    post.content = postInput.content;
    if (postInput.imageUrl !== "undefined") {
      post.imageUrl = postInput.imageUrl;
    }
    const updatedPost = await post.save();
    //'_doc' means that it will contain only the userData without all the meta data that moogoose will add like 'findOne()'
    //what you return here must match what you are returning in the schema
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },

  //this function is named deletePost because we named it deletePost in the schema file
  //the value in the argument must also match the one in the schema file, 'req' is passed in by default
  deletePost: async function ({ id }, req) {
    //we stored the value of 'isAuth' in the req object, in the auth.js file, in the middleware folder
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 401;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    const post = await Post.findById(id);
    if (!post) {
      const error = new Error("No post found");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 404;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 403;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    //deleteImage is a fn we defined in another file and imported here
    deleteImage(post.imageUrl);
    await Post.findByIdAndRemove(id);
    //we stored the userId in the auth.js file in the middleware folder
    const user = await User.findById(req.userId);
    //pull(). => pulls or removes the post with that id from the post array in the user collection
    user.posts.pull(id);
    await user.save();
    //what you return here must match what you are returning in the schema
    return true;
  },

  //this function is named user because we named it user in the schema file
  //the value in the argument must also match the one in the schema file, 'req' is passed in by default
  user: async function (args, req) {
    //since this fn do not expect any arguement, we just name it 'args'
    //we stored the value of 'isAuth' in the req object, in the auth.js file, in the middleware folder
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 401;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    //we stored the userId in the auth.js file in the middleware folder
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No user found");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 404;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    //'_doc' means that it will contain only the userData without all the meta data that moogoose will add like 'findOne()'
    //what you return here must match what you are returning in the schema
    return { ...user._doc, _id: user._id.toString() };
  },

  //this function is named updateStatus because we named it updateStatus in the schema file
  //the value in the argument must also match the one in the schema file, 'req' is passed in by default
  updateStatus: async function ({ status }, req) {
    //we stored the value of 'isAuth' in the req object, in the auth.js file, in the middleware folder
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 401;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    //we stored the userId in the auth.js file in the middleware folder
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No user found");
      //error.code => we are adding a code field to the error object and giving it a value
      error.code = 404;
      //this will give a response to the user with this error message, with its own status code with
      //the aid of the "customFormatErrorFn()" function in app.js
      throw error;
    }
    user.status = status;
    await user.save();
    //'_doc' means that it will contain only the userData without all the meta data that moogoose will add like 'findOne()'
    //what you return here must match what you are returning in the schema
    return { ...user._doc, _id: user._id.toString() };
  },
};
