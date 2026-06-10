/* eslint-disable no-console */
const formatMessage = (level, args) => {
  const time = new Date().toISOString();
  return [`[${time}] [${level}]`, ...args];
};

module.exports = {
  info: (...args) => console.info(...formatMessage('INFO', args)),
  warn: (...args) => console.warn(...formatMessage('WARN', args)),
  error: (...args) => console.error(...formatMessage('ERROR', args)),
};
