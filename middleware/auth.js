const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  //get() is used to get the content in the headers
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    //here we are creating an isAuth value on the req object on the fly
    req.isAuth = false;
    return next();
  }
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    //"somesupersecretkeywords" => this has to be the key you used this create this token in the resolver.js file
    decodedToken = jwt.verify(token, "somesupersecretkeywords");
  } catch (err) {
    //we are creating this value 'isAuth' on the req object on the fly here
    req.isAuth = false;
    return next();
  }
  if (!decodedToken) {
    const error = new Error("Not authenticated");
    //we are creating this value 'isAuth' on the req object on the fly here
    req.isAuth = false;
    return next();
  }

  //we are storing the userId in the req object to use it globally for this specific connection instance
  //decodedToken.userId => the userId is already store in the token, when we created this token and sent to the user
  req.userId = decodedToken.userId;
  //we are creating this value 'isAuth' on the req object on the fly here
  req.isAuth = true;
  next();
};
