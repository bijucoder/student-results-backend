var AWS = require("aws-sdk");
var dynamoDB = new AWS.DynamoDB.DocumentClient();
const response = require("./response");

async function manageAwardResource(event, callback) {
  switch (event.httpMethod) {
    case "GET":
      {
        if (
          event["queryStringParameters"]["name"] &&
          event["queryStringParameters"]["awardId"]
        ) {
          getAwardByNameAndAwardId(event, callback);
        } else {
          response.return_response(
            JSON.stringify(
              "missing mandatory queryString parameters name & awardId"
            ),
            400,
            callback
          );
        }
      }
      break;
  }
}

function getAwardByNameAndAwardId(event, callback) {
  console.log("Get Award By Name And AwardId Function");
  const name = event["queryStringParameters"]["name"];
  const awardId = event["queryStringParameters"]["awardId"];
  var pk = "ID#" + awardId;
  dynamoDB
    .query({
      TableName: process.env.ddbName,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: {
        "#pk": "PK",
      },
      ExpressionAttributeValues: {
        ":pk": pk,
      },
    })
    .promise()
    .then((data) => {
      var Items = [];
      console.log("Response : ", JSON.stringify(data.Items));
      data.Items.forEach(function (item) {
        var responseData = {};
        //check if ddb item name contains supplied name
        if (item.name.includes(name)) {
          console.log("item from dynamodb contains the name - success");
          item.data ? (responseData.data = JSON.parse(item.data)) : "";
          item.EntityType ? (responseData.EntityType = item.EntityType) : "";
          item.Name ? (responseData.Name = item.Name) : "";
          item.ID ? (responseData.ID = item.ID) : "";
          response.return_response_with_headers(
            JSON.stringify(responseData),
            200,
            event,
            callback
          );
        } else {
          console.log("item from dynamodb does not have name matching");
          response.return_response(
            JSON.stringify("no matching record found"),
            400,
            callback
          );
        }
        Items.push(responseData);
      });
      response.return_response_with_headers(
        JSON.stringify({
          items: Items,
        }),
        200,
        event,
        callback
      );
    })
    .catch((error) => {
      console.error("Error with ", error);
      response.return_response(JSON.stringify(error), 400, callback);
    });
}

module.exports = { manageAwardResource };
