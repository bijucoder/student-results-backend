const document = require("./document");
const award = require("./award");
const auth = require("./auth");

exports.handler = (event, context, callback) => {
  console.log("event : ", JSON.stringify(event));
  // These API endpoints dont need permission checks
  if (event.resource == "/award" && event.httpMethod == "GET") {
    award.manageAwardResource(event, callback);
  }

  // These API endpoints need permission check
  auth.checkResourcePermissions(event, function (hasPermission, event) {
    console.log("checkResourcePermissions response", hasPermission);
    if (hasPermission) {
      if (
        event.resource == "/document" ||
        event.resource == "/document/{docId}"
      ) {
        document.manageDocumentResource(event, callback);
      }
    } else {
      console.log("resource permissions NOT available");
      return_response(
        JSON.stringify({
          error: "Access Denied",
        }),
        403,
        callback
      );
    }
  });
};

function return_response(body, statusCode, callback) {
  const response = {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*", // Required for CORS support to work
      "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
      "content-type": "application/json",
    },
    body: body,
  };
  callback(null, response);
}
