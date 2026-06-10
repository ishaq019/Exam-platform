// Get your current public IP address
const https = require("https");
const logger = require("./utils/logger");

https.get("https://api.ipify.org?format=json", (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const ip = JSON.parse(data).ip;
    logger.info("Your Public IP:", ip);
    logger.info("\nAdd this IP to MongoDB Atlas:");
    logger.info("1. https://cloud.mongodb.com/v2");
    logger.info("2. Project → Network Access");
    logger.info('3. Click "+ Add IP Address"');
    logger.info(`4. Enter: ${ip}`);
  });
}).on("error", (err) => {
  logger.error("Error getting IP:", err.message);
});
