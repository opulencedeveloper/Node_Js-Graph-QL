const fs = require("fs");
const path = require("path");

// see the classic-node-js-server-code-to-know-how-this-works
//this package is for user-input-validation
const { validationResult } = require("express-validator");

const io = require("../socket");
const Post = require("../models/post");
const User = require("../models/user");

exports.getPosts = async (req, res, next) => {
  //see how i implement pagination in the classic node server to know what this paginationis doing
  const currentPage = req.query.page || 1;
  const contentPerPage = 2;

  try {
    const totalItems = await Post.find().countDocuments();
    //if the total item find() return was 10, and the result of skip was 3,
    //skip will skip the first 3 items returned by find and returns the rest
    //limit(), this limits the total items returned by skip, if skip return 7 items
    //an limit() was given an argumet of 5, limit will only the first 5 items return by skip
    const posts = await Post.find()
      //since the key 'creator' only holds the id of the user in the post collection, populute takes that user id stored in 'creator'
      //field and includes all the creator raw data here
      .populate("creator")
      //'createdAt' is a key in db that holds date
      //'-1' means sorting in a descending way
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * contentPerPage)
      .limit(contentPerPage);
    res.status(200).json({
      message: "Fetched posts success",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      //we are creating this value 'statusCode' on the error object on the fly here
      err.statusCode = 500;
    }
    //this error will be handled by the error handling middleware in the app.js file
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  // validationResult() => see the classic-node-js-server-code-to-know-how-this-works
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    //we are creating this value 'statusCode' on the error object on the fly here
    error.statusCode = 422;
    //this error will be handled by the error handling middleware in the app.js file
    //since this code is not async, if it was async, use next(error)
    throw error;
  }
  if (!req.file) {
    const error = new Error("No image provided.");
    //we are creating this value 'statusCode' on the error object on the fly here
    error.statusCode = 422;
    ///we used 'throw error', since this code is not async, which ends up in the catch block
    //where it is handled if it was async, use next(error)
    throw error;
  }
  //.replace(/\\/g, "/") => helps replace this '//'with '/' in the path
  const imageUrl = req.file.path.replace(/\\/g, "/");
  const title = req.body.title;
  const content = req.body.content;

  const post = Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    //req.userId => we stored the userId in the token which we extracted in the "is-auth" file in the middleware folder
    //then we now stored it to the req object
    creator: req.userId,
  });
  try {
    await post.save();

    //req.userId => we stored the userId in the token which we extracted in the "is-auth" file in the middleware folder
    //then we now stored it to the req object
    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();

    //here we inform other users, '.emit' sends the message to all connected users. there also '.broadcast' which send a message to all connected users except you
    //the arguement 'posts' passed to emit is the name of the message you are sending, which you use to identfy this message on the front-end, you'll be looking for this key if you
    //you want to listen to messages from this channel called 'posts', the second argument is the message
    ///the action key is optional, it just an indicator telling the users what happened or the action
    //'_doc' => see the classic node server ro know what '_doc' does
    //req.id => we stored the user data in the token anytime we login, which we extract from the token and add to the req object
    io.getIO().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });
    res.status(201).json({
      message: "Post created successfully!",
      post: post,
      creator: { _id: user._id, name: user.name },
    });
  } catch (err) {
    if (!err.statusCode) {
      //we are creating this value 'statusCode' on the error object on the fly here
      err.statusCode = 500;
    }
    //this error will be handled by the error handling middleware in the app.js file
    next(err);
  }
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Cound not find post.");
        //we are creating this value 'statusCode' on the error object on the fly here
        err.statusCode = 404;
        //using throw inside an async code won't work because you have to use next() to handle the errors here,
        //but when you throw in a then() block, the catch block will handle it, this is where we now throw the error using next
        throw error;
      }
      res.status(200).json({ messsage: "Post fetched", post: post });
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

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;

  // validationResult() => see the classic-node-js-server-code-to-know-how-this-works
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    //we are creating this value 'statusCode' on the error object on the fly here
    error.statusCode = 422;
    ///we used 'throw error', since this code is not async, which ends up in the catch block
    //where it is handled if it was async, use next(error)
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;

  if (req.file) {
    console.log("imageUrl");
    console.log(imageUrl);
    console.log(req.file.path);
    imageUrl = req.file.path;
  }

  if (!imageUrl) {
    const error = new Error("No file picked.");
    //we are creating this value 'statusCode' on the error object on the fly here
    error.statusCode = 422;
    ///we used 'throw error', since this code is not async, which ends up in the catch block
    //where it is handled if it was async, use next(error)
    throw error;
  }
  try {
    //since the key 'creator' only holds the id of the user in the post collection, populute takes that user id stored in 'creator'
      //field and includes all the creator raw data here
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("Could not find post.");
      //we are creating this value 'statusCode' on the error object on the fly here
      err.statusCode = 404;
      //using throw inside an async code won't work because you have to use next() to handle the errors here,
      //but when you throw in a then() block, the catch block will handle it, this is where we now throw the error using next
      throw error;
    }

    //req.userId => we stored the userId in the token which we extracted in the "is-auth" file in the middleware folder
    //since used 'populate' to convert (the creator key in the db which holds the id) 'creator' to the full
    //user object, we now access it with creator._id
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("No authorized.");
      //we are creating this value 'statusCode' on the error object on the fly here
      error.statusCode = 403;
      ///we used 'throw error', since this code is not async, which ends up in the catch block
      //where it is handled, if it was async, use next(error)
      throw error;
    }
    if (imageUrl !== post.imageUrl) {
      //clearImage() is a fn we defined at the buttom of this file
      clearImage(post.imageUrl);
    }
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const result = await post.save();

    //here we inform other users, '.emit' sends the message to all connected users. there also '.broadcast' which send a message to all connected users except you
    //the arguement 'posts' passed to emit is the name of the message you are sending, which you use to identfy this message on the front-end, you'll be looking for this key if you
    //you want to listen to messages from this channel called 'posts', the second argument is the message
    ///the action key is optional, it just an indicator telling the users what happened or the action
    io.getIO().emit("posts", {
      action: "update",
      post: result,
    });
    res.status(200).json({ message: "Post updated!", post: result });
  } catch (err) {
    if (!err.statusCode) {
      //we are creating this value 'statusCode' on the error object on the fly here
      err.statusCode = 500;
    }
    //this error will be handled by the error handling middleware in the app.js file'
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("Cound not find post.");
      //we are creating this value 'statusCode' on the error object on the fly here
      err.statusCode = 404;
      //using throw inside an async code won't work because you have to use next() to handle the errors here,
      //but when you throw in a then() block, the catch block will handle it, this is where we now throw the error using next
      throw error;
    }

    //req.userId => we stored the userId in the token which we extracted in the "is-auth" file in the middleware folder
    //and stored it in the req object
    if (post.creator.toString() !== req.userId) {
      const error = new Error("No authorized.");
      //we are creating this value 'statusCode' on the error object on the fly here
      error.statusCode = 403;
      ///we used 'throw error', since this code is not async, which ends up in the catch block
      //where it is handled, if it was async, use next(error)
      throw error;
    }
    //clearImage() is a fn we defined at the buttom of this file
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);
    //req.userId => we stored the userId in the token which we extracted in the "is-auth" file in the middleware folder
    //and stored it in the req object
    const user = await User.findById(req.userId);
    //we pull out only the post with this id => 'postId',
    user.posts.pull(postId);
    //then save back the post
    await user.save();

    //here we inform other users, '.emit' sends the message to all connected users. there also '.broadcast' which send a message to all connected users except you
    //the arguement 'posts' passed to emit is the name of the message you are sending, which you use to identfy this message on the front-end, you'll be looking for this key if you
    //you want to listen to messages from this channel called 'posts', the second argument is the message
    ///the action key is optional, it just an indicator telling the users what happened or the action
    io.getIO().emit("posts", {
      action: "delete",
      post: postId,
    });
    res.status(200).json({ message: "Deleted post." });
  } catch (err) {
    if (!err.statusCode) {
      //we are creating this value 'statusCode' on the error object on the fly here
      err.statusCode = 500;
    }
    //this error will be handled by the error handling middleware in the app.js file
    next(err);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  //unlink() is used to delete a file
  fs.unlink(filePath, (err) => console.log(err));
};
