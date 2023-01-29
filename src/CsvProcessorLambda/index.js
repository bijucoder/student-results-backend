const csv = require("csv-parser");
const aws = require("aws-sdk");
const s3 = new aws.S3({ apiVersion: "2006-03-01" });
var dynamoDB = new aws.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");

exports.handler = async (event, context) => {
  const promises = event.Records.map((record) => {
    const Bucket = record.s3.bucket.name;
    const Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const params = { Bucket, Key };
    const stream = s3.getObject(params).createReadStream();
    const awards = [];
    return new Promise(function (reject) {
      stream
        .pipe(csv())
        .on("data", (data) => {
          console.log("on data");
          awards.push(data);
          console.log(data);
          console.log(data["Learner"]);
          console.log(data["Award ID"]);
        })
        .on("error", (error) => {
          console.error(error);
          reject(error);
        })
        .on("end", (rows) => {
          console.log("on end");
          createAwards(awards, params);
        });
    });
  });

  return Promise.all(promises);
};

function createAwards(awards, s3Params) {
  console.log("Create Awards function");
  awards.forEach((award) => {
    const uuidValue = uuidv4();
    var item = {
      data: JSON.stringify(award),
    };
    var date = new Date().toISOString().slice(0, 10);
    item["PK"] = "AWARD#" + uuidValue;
    item["SK"] = "AWARD#" + uuidValue;

    item["GSI1-PK"] = "AWARD#" + award["Award ID"];
    item["GSI1-SK"] = "NAME#" + award["Learner"] + "AWARD#" + uuidValue;

    item["EntityType"] = "award";
    item["UploadedDate"] = new Date().getTime();
    item["Source"] = s3Params;
    console.log("Create Award item : ", JSON.stringify(item));
    dynamoDB
      .put({
        Item: item,
        TableName: process.env.ddbName,
        ConditionExpression:
          "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      })
      .promise()
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.error("Error with ", error);
      });
  });
}
