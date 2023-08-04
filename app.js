const path = require("path");
const fs = require("fs");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
//package helps to parse images
const multer = require("multer");
//install the package together with 'graphql' same time, like this => npm install --save graphql express-graphql
const { graphqlHTTP } = require("express-graphql");

const graphqlSchema = require("./grapql/schema");
const graphqlResolver = require("./grapql/resolvers");
const auth = require("./middleware/auth");
const { deleteImage } = require("./util/delete-file");

const rootDir = require("./util/path");

const app = express();

// see the classic-node-js-server-code-to-know-what-this-line-is-doing
const fileStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "images");
  },
  filename: (req, file, callback) => {
    const random = (Math.random() + 1).toString(36).substring(7);
    callback(null, random + "-" + file.originalname);
  },
});

const myFileFilter = (req, file, callback) => {
  //to the if function and false of not
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

app.use(bodyParser.json());

// see the classic-node-js-server-code-to-know-what-this-route-is-doing
app.use(
  multer({ storage: fileStorage, fileFilter: myFileFilter }).single("image")
);

// see the classic-node-js-server-code-to-know-what-this-route-is-doing
app.use("/images", express.static(path.join(rootDir, "images")));

app.use((req, res, next) => {
  //this sets the domains that can connect to this server, "*" means any domain
  res.setHeader("Access-Control-Allow-Origin", "*");
  //this sets the http-request that are allowed in this server
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  //this allows the type of headers added here to be sent to this server,
  //since we specified, Content-Type and Authorization. we can include Content type headers
  //like => 'Content-Type': 'application/json', Authorization header is used for setting a token
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  //this was added because of GraphQL CORS errors. since the browser sends an 'OPTIONS' request to check if the req methods is about to send is allowed
  //and is expected to get a response staus code of 200 if is allowed, we send a status code of 200. to give the browser an OK response, after we haved stated the allowed request above
  //to avoid CORS error
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

//this middleWare is for authentication, which runs for every incoming request
app.use(auth);

app.put("/post-image", (req, res, next) => {
  //we stored the value of 'isAuth' in the req object, in the auth.js file, in the middleware folder
  if (!req.isAuth) {
    //this will give a response to the user with this error message, with its own status code with
    //the aid of the "customFormatErrorFn()" function in this file
    throw new Error("Not authenticated");
  }
  if (!req.file) {
    return res.status(200).json({ message: "No file provided!" });
  }
  if (req.body.oldPath) {
    //deleteImage() is a fn we defined in another file which we imported
    deleteImage(req.body.oldPath);
  }
  return res.status(201).json({
    message: "File stored.",
    //.replace(/\\/g, "/") => helps replace this '//'with '/' in the path
    //due to the way windows saves files path
    filePath: req.file.path.replace(/\\/g, "/"),
  });
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    //this receives the error detected by graphQL
    customFormatErrorFn(err) {
      //'originalError' will be set if express-graphQl detects an error thrown in your code
      //either by you or some 3rd party package, but if you have a technical error like a missing
      //character in your code. then it be in the 'err' object, this error is thrown by graphQL itself
      if (!err.originalError) {
        return err;
      }
      //we added this field '.data' by ourself in the resolver file, same with '.message' and '.code'
      const data = err.originalError.data;
      const message = err.message || "An error occured";
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    },
    //this gives you a GraphQL integrated development environment (IDE),
    //when you enter 'http://localhost:8080/graphql' on the browser
    //that allows you to play around with your graphQL API
    graphiql: true,
  })
);

//this is an error handling middlie-ware
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  //error.message => this property exist by default and it holds the error message you passed
  //to the Error object constructor where this error was thrown, or when you pass the erroe to next(err)
  const message = error.message;
  //this error(passed by you from the express validator package) was passed by you in auth.js inthe controllers folder
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});
//

mongoose
  .connect(
    "mongodb+srv://victorkudos:yPj5L429bl3BEhoT@cluster0.iogciqk.mongodb.net/messages?retryWrites=true&w=majority"
  )
  .then((result) => {
    app.listen(8080);
    console.log("Connected");
  })
  .catch((err) => console.log(err));
