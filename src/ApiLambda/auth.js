var AWS = require("aws-sdk");
var dynamoDB = new AWS.DynamoDB.DocumentClient();
const jwt_decode = require("jwt-decode");

async function checkResourcePermissions(event, callback) {
  var jwt = event.headers.Authorization;

  const decodedToken = jwt_decode(jwt);

  console.log("decodedToken", JSON.stringify(decodedToken));
  console.log(
    "cognito groups for the user from JWT >> cognito:groups",
    decodedToken["cognito:groups"]
  );

  var groups = decodedToken["cognito:groups"];

  if (groups.indexOf("admin") > -1) {
    return callback(true, event);
  } else {
    return callback(false, event);
  }
}

module.exports = { checkResourcePermissions };
