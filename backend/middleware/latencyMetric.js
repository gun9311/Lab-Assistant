// middleware/latencyMetric.js
const AWS = require("aws-sdk");
AWS.config.update({ region: "ap-northeast-2" });
const cloudwatch = new AWS.CloudWatch();

module.exports = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const latency = Date.now() - start;

    // 더 상세한 메트릭 전송
    cloudwatch
      .putMetricData({
        Namespace: "LabAssistant/Express",
        MetricData: [
          {
            MetricName: "Latency",
            Unit: "Milliseconds",
            Value: latency,
            Dimensions: [
              {
                Name: "Route",
                Value: req.route?.path || req.path || "unknown",
              },
              {
                Name: "Method",
                Value: req.method,
              },
              {
                Name: "StatusCode",
                Value: res.statusCode.toString(),
              },
            ],
          },
        ],
      })
      .promise()
      .catch((err) => {
        console.error("CloudWatch error:", err);
      });
  });

  next();
};
