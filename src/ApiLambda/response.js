var AWS = require("aws-sdk");
var dynamoDB = new AWS.DynamoDB.DocumentClient();
const jwt_decode = require("jwt-decode");

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

function return_response_with_headers(body, statusCode, event, callback) {
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

function publish_and_return_response_with_headers(
  payload,
  statusCode,
  event,
  callback
) {
  console.log("********* publish_and_return_response_with_headers ********* ");

  const response = {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*", // Required for CORS support to work
      "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  };

  if (event.queryStringParameters) {
    console.log("queryStringParameters exists");

    if (event.queryStringParameters.publishToApiTopic) {
      console.log(
        "event.queryStringParameters.publishToApiTopic",
        event.queryStringParameters.publishToApiTopic
      );
      console.log("process.env.apiSnsTopicArn", process.env.apiSnsTopicArn);
      var eventName = payload["entityType"] + "Created";
      var eventText = JSON.stringify(payload, null, 2);
      if (statusCode == 200) {
        eventName = payload.data["entityType"] + "Updated";
        eventText = JSON.stringify(payload.data, null, 2);
      }
      if (statusCode == 204) {
        eventName = payload["entityType"] + "Deleted";
      }

      // Create publish parameters
      console.log("response payload", JSON.stringify(payload, null, 2));
      var params = {
        MessageAttributes: {
          EventName: {
            DataType: "String",
            StringValue: `${eventName}`,
          },
          OrgUnit: {
            DataType: "String",
            StringValue: event.headers["x-ouid"],
          },
        },
        Message: eventText,
        TopicArn: process.env.apiSnsTopicArn,
      };

      var publishTextPromise = new AWS.SNS({ apiVersion: "2010-03-31" })
        .publish(params)
        .promise();

      publishTextPromise
        .then(function (data) {
          console.log(
            `Message ${params.Message} sent to the topic ${params.TopicArn}`
          );
          console.log("MessageID is " + data.MessageId);
        })
        .catch(function (err) {
          console.error(err, err.stack);
        });
    }
  }
  console.log("callback response body is " + response.body);

  callback(null, response);
}

function publish_conditionally_and_return_response_with_headers(
  payload,
  statusCode,
  event,
  callback
) {
  console.log(
    "********* publish_conditionally_and_return_response_with_headers ********* "
  );

  const response = {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*", // Required for CORS support to work
      "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  };

  if (event.queryStringParameters) {
    console.log("queryStringParameters exists");

    if (event.queryStringParameters.publishToApiTopic) {
      console.log(
        "event.queryStringParameters.publishToApiTopic",
        event.queryStringParameters.publishToApiTopic
      );
      console.log("process.env.apiSnsTopicArn", process.env.apiSnsTopicArn);
      var eventName = payload["entityType"] + "Created";
      var eventText = JSON.stringify(payload, null, 2);
      if (statusCode == 200) {
        eventName = payload.data["entityType"] + "Updated";
        eventText = JSON.stringify(payload.data, null, 2);
      }
      if (statusCode == 204) {
        eventName = payload["entityType"] + "Deleted";
      }

      // Create publish parameters
      console.log("response payload", JSON.stringify(payload, null, 2));
      var params = {
        MessageAttributes: {
          EventName: {
            DataType: "String",
            StringValue: `${eventName}`,
          },
          OrgUnit: {
            DataType: "String",
            StringValue: event.headers["x-ouid"],
          },
        },
        Message: eventText,
        TopicArn: process.env.apiSnsTopicArn,
      };

      var publishTextPromise = new AWS.SNS({ apiVersion: "2010-03-31" })
        .publish(params)
        .promise();

      publishTextPromise
        .then(function (data) {
          console.log(
            `Message ${params.Message} sent to the topic ${params.TopicArn}`
          );
          console.log("MessageID is " + data.MessageId);
        })
        .catch(function (err) {
          console.error(err, err.stack);
        });
    }
  }

  callback(null, response);
}

module.exports = {
  return_response_with_headers,
  return_response,
  publish_and_return_response_with_headers,
  publish_conditionally_and_return_response_with_headers,
};
