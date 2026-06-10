const { Readable } = require("stream");

const streamCsv = (res, csv, fileName = "report.csv") => {
  const buffer = Buffer.from(csv, "utf-8");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

  Readable.from([buffer]).pipe(res);
};

module.exports = streamCsv;
