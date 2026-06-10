/* eslint-disable no-console */
const shouldLogDebug = process.env.NODE_ENV !== "production";

const logger = {
  info(...args) {
    console.log(...args);
  },
  warn(...args) {
    console.warn(...args);
  },
  error(...args) {
    console.error(...args);
  },
  debug(...args) {
    if (shouldLogDebug) {
      console.log(...args);
    }
  },
};

module.exports = logger;
