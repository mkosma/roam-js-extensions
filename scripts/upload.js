const fs = require("fs");
const AWS = require("aws-sdk");
const path = require("path");

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const cloudfront = new AWS.CloudFront({ apiVersion: "2020-05-31" });
const waitForCloudfront = (props) =>
  new Promise((resolve) => {
    const { trial = 0, ...args } = props;
    cloudfront
      .getInvalidation(args)
      .promise()
      .then((r) => r.Invalidation.Status)
      .then((status) => {
        if (status === "Completed") {
          resolve("Done!");
        } else if (trial === 60) {
          resolve("Ran out of time waiting for cloudfront...");
        } else {
          console.log(
            "Still waiting for invalidation. Found",
            status,
            "on trial",
            trial
          );
          setTimeout(
            () => waitForCloudfront({ ...args, trial: trial + 1 }),
            1000
          );
        }
      });
  });

const extension = process.argv[2];
const DistributionId =
  process.env.CLOUDFRONT_ARN.match(/:distribution\/(.*)$/)[1];

const content = fs.readFileSync(`out/extensions/${extension}.html`).toString();
const linkRegex = /<(?:link|script) (?:.*?)(?:href|src)="(.*?)"(?:.*?)(?:\/)?>/;
const allContent = fs.existsSync(`out/extensions/${extension}`)
  ? [
      { Key: `extensions/${extension}`, Body: content },
      ...fs.readdirSync(`out/extensions/${extension}`).map((f) => ({
        Key: `extensions/${extension}/${f}`,
        Body: fs.readFileSync(`out/extensions/${extension}/${f}`).toString(),
      })),
    ]
  : [{ Key: `extensions/${extension}`, Body: content }];
const fileNames = Array.from(
  new Set(
    allContent.flatMap((c) =>
      (c.Body.match(new RegExp(linkRegex, "g")) || [])
        .map((m) => m.match(linkRegex)[1])
        .map(decodeURIComponent)
    )
  )
);
console.log(
  "filenames to upload with",
  allContent.map(({ Key }) => Key.replace(/^extension\//, "")),
  "\n",
  fileNames
);
const uploads = fileNames
  .map((m) => ({
    name: m,
    Body: fs.readFileSync(path.join(__dirname, "..", "out", m)).toString(),
  }))
  .map(({ name, Body }) =>
    s3
      .upload({
        Bucket: "roamjs.com",
        Body,
        Key: name.slice(1),
        ContentType: name.endsWith(".js")
          ? "text/javascript"
          : name.endsWith(".css")
          ? "text/css"
          : "text/plain",
      })
      .promise()
  );

Promise.all([
  ...allContent.map(({ Key, Body }) =>
    s3
      .upload({
        Bucket: "roamjs.com",
        Body,
        Key: Key.replace(/\.html$/, ""),
        ContentType: "text/html",
      })
      .promise()
  ),
  ...uploads,
])
  .then((items) => {
    console.log("Successfully uploaded", items.length, "files");
    return cloudfront
      .createInvalidation({
        DistributionId,
        InvalidationBatch: {
          CallerReference: new Date().toJSON(),
          Paths: {
            Quantity: 1,
            Items: [`/extensions/${extension}*`],
          },
        },
      })
      .promise();
  })
  .then((r) => waitForCloudfront({ Id: r.Invalidation.Id, DistributionId }))
  .then(console.log);
