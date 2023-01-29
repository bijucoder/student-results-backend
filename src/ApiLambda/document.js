var AWS = require("aws-sdk");
var dynamoDB = new AWS.DynamoDB.DocumentClient();
const jwt_decode = require("jwt-decode");
const response = require("./response");
const s3 = new AWS.S3();
const { v4: uuidv4 } = require("uuid");

async function manageDocumentResource(event, callback) {
  switch (event.httpMethod) {
    case "POST":
      {
        createDocument(event, callback);
      }
      break;
    case "GET":
      {
        if (event.queryStringParameters) {
          if (event.queryStringParameters.getUploadSignedUrl) {
            console.log(
              "Query String Parameters createPutObjectSignedUrl : ",
              event.queryStringParameters.getUploadSignedUrl
            );
            createPutObjectSignedUrl(event, callback);
          }
          if (event.queryStringParameters.getDownloadSignedUrl) {
            console.log(
              "Query String Parameters getDownloadSignedUrl : ",
              event.queryStringParameters.getDownloadSignedUrl
            );
            createGetObjectSignedUrl(event, callback);
          }
        }
        if (event.pathParameters && !event.queryStringParameters) {
          if (event.pathParameters.docId) {
            getDocumentByDocId(event, callback);
          } else {
            getAllDocuments(event, callback);
          }
        }
        if (!event.pathParameters && !event.queryStringParameters) {
          getAllDocuments(event, callback);
        }
      }
      break;
    case "DELETE":
      {
        if (event.pathParameters.docId) {
          deleteDocument(event, callback);
        }
      }
      break;
  }
}

function createDocument(event, callback) {
  console.log("Create Document function");
  var payload = JSON.parse(event.body);
  var jwt = (jwt = event.headers.Authorization);
  const uuidValue = uuidv4();
  if (jwt) {
    const decodedToken = jwt_decode(jwt);
    var name = decodedToken["name"];
    payload["uploadedBy"] = name;
  }
  payload["uploadedDate"] = new Date().getTime();
  payload["identifier"] = uuidValue;
  payload["bucket"] = process.env.documentsS3;
  var item = {
    data: JSON.stringify(payload),
  };
  var date = new Date().toISOString().slice(0, 10);
  item["PK"] = "DOC#" + uuidValue;
  item["SK"] = "DOC#" + uuidValue;

  item["GSI1-PK"] = "DOCUMENT#";
  item["GSI1-SK"] = "DT" + date + "DOC#" + uuidValue;

  item["EntityType"] = "document";
  console.log("Create Document item : ", JSON.stringify(item));
  dynamoDB
    .put({
      Item: item,
      TableName: process.env.ddbName,
      ConditionExpression:
        "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
    .promise()
    .then((data) => {
      console.log(data.Attributes);
      response.return_response_with_headers(
        JSON.stringify(payload),
        201,
        event,
        callback
      );
    })
    .catch((error) => {
      console.error("Error with ", error);
      response.return_response(JSON.stringify(error), 400, callback);
    });
}

function deleteDocument(event, callback) {
  console.log("Delete Document function");
  const documentId = event.pathParameters.docId;
  var pk = "DOC#" + documentId;
  var sk = "DOC#" + documentId;
  deleteS3ObjectWithDocId(event);

  console.log("Delete Document By Id, pk :", pk);

  dynamoDB
    .delete({
      TableName: process.env.ddbName,
      Key: {
        PK: pk,
        SK: sk,
      },
    })
    .promise()
    .then((data) => {
      response.return_response(
        JSON.stringify({ itemDeleted: documentId }),
        204,
        callback
      );
    })
    .catch((error) => {
      console.error("Error with ", error);
      response.return_response(JSON.stringify(error), 400, callback);
    });
}

function getAllDocuments(event, callback) {
  console.log("Get All Documents");
  var pk = "DOCUMENT#";
  console.log("Get All Documents pk :", pk);
  dynamoDB
    .query({
      TableName: process.env.ddbName,
      IndexName: "GSI1",
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: {
        "#pk": "GSI1-PK",
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
        item.data ? (responseData.data = JSON.parse(item.data)) : "";
        item.displayName ? (responseData.displayName = item.displayName) : "";
        item.EntityType ? (responseData.EntityType = item.EntityType) : "";
        item.displayDescription
          ? (responseData.displayDescription = item.displayDescription)
          : "";
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

async function deleteS3ObjectWithDocId(event) {
  console.log("Get Document By DocumentId");
  var docId = event.pathParameters.docId;
  var pk = "DOC#" + docId;
  var sk = "DOC#" + docId;
  console.log("Get Document By DocumentId", pk);
  dynamoDB
    .query({
      TableName: process.env.ddbName,
      Key: {
        PK: pk,
        SK: sk,
      },
    })
    .promise()
    .then((data) => {
      console.log("Response : ", data);
      // return the document item
      const itemData = JSON.parse(data.Item.data);
      console.log("itemData : ", itemData);
      if (itemData && itemData.key && itemData.bucket) {
        console.log("key : ", itemData.key);
        console.log("bucket : ", itemData.bucket);
        var params = {
          Bucket: itemData.bucket,
          Key: itemData.key,
        };
        s3.deleteObject(params, function (err, data) {
          if (err) console.log(err, err.stack);
          // an error occurred
          else console.log(data); // successful response
        });
      }
    })
    .catch((error) => {
      console.error("Error with ", error);
    });
}

function getDocumentByDocId(event, callback) {
  console.log("Get Document By DocId Function");
  const docId = event.pathParameters.docId;
  console.log("Path Param docId : ", docId);
  var pk = "DOC#" + docId;
  var sk = "DOC#" + docId;
  console.log("Get Works By DocId Function pk : ", pk);
  console.log("Get Works By DocId Function sk : ", sk);
  dynamoDB
    .get({
      TableName: process.env.ddbName,
      Key: {
        PK: pk,
        SK: sk,
      },
    })
    .promise()
    .then((data) => {
      console.log("Response : ", JSON.stringify(data));
      var responseData = {};
      data.Item.data ? (responseData.data = JSON.parse(data.Item.data)) : "";
      data.Item.EntityType
        ? (responseData.EntityType = data.Item.EntityType)
        : "";
      response.return_response_with_headers(
        JSON.stringify(responseData),
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

async function createPutObjectSignedUrl(event, callback) {
  const URL_EXPIRATION_SECONDS = 60 * 50;
  const randomID = parseInt(Math.random() * 10000000);
  const uuidValue = uuidv4();
  var file = `${randomID}` + ".jpeg";
  var contentType = "";

  if (event.queryStringParameters.file) {
    file = event.queryStringParameters.file;
  }
  var Key = `${uuidValue}/${file}`;
  var prefix = "";
  if (event.queryStringParameters.prefix) {
    prefix = event.queryStringParameters.prefix;
    Key = `${prefix}/${uuidValue}/${file}`;
  }
  // Get signed URL from S3
  const s3Params = {
    Bucket: process.env.documentsS3,
    Key,
    Expires: URL_EXPIRATION_SECONDS,
  };

  console.log("Params: ", s3Params);
  try {
    const uploadURL = await s3.getSignedUrlPromise("putObject", s3Params);
    console.log("uploadURL: ", uploadURL);
    var url = {
      uploadURL: uploadURL,
      Key,
    };
    response.return_response(JSON.stringify(url), 200, callback);
  } catch (e) {
    console.log(`error create Signed Url : ${e}`);
    // throw e;
    response.return_response(JSON.stringify(e), 400, callback);
  }
}

async function createGetObjectSignedUrl(event, callback) {
  const URL_EXPIRATION_SECONDS = 60 * 50;

  var Key;

  if (event.queryStringParameters.file) {
    Key = event.queryStringParameters.file;
  } else {
    response.return_response(
      JSON.stringify({ error: "file not specified" }),
      400,
      callback
    );
  }

  // Get signed URL from S3
  const s3Params = {
    Bucket: process.env.documentsS3,
    Key,
    Expires: URL_EXPIRATION_SECONDS,
  };

  console.log("Params: ", s3Params);
  try {
    const getURL = await s3.getSignedUrlPromise("getObject", s3Params);
    console.log("uploadURL: ", getURL);
    var url = {
      getURL: getURL,
      Key,
    };
    response.return_response(JSON.stringify(url), 200, callback);
  } catch (e) {
    console.log(`error create Signed Url : ${e}`);
    // throw e;
    response.return_response(JSON.stringify(e), 400, callback);
  }
}

module.exports = { manageDocumentResource };
