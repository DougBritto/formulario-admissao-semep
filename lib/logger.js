function createLogger(scope) {
  function format(level, message, meta) {
    const entry = {
      time: new Date().toISOString(),
      level,
      scope,
      message
    };

    if (meta && Object.keys(meta).length) {
      entry.meta = meta;
    }

    return JSON.stringify(entry);
  }

  return {
    info(message, meta = {}) {
      console.log(format('info', message, meta));
    },
    warn(message, meta = {}) {
      console.warn(format('warn', message, meta));
    },
    error(message, meta = {}) {
      console.error(format('error', message, meta));
    }
  };
}

module.exports = {
  createLogger
};
