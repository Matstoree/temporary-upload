function cookieParser(req, res, next) {
  req.cookies = {};
  const header = req.headers.cookie;

  if (header) {
    header.split(';').forEach((pair) => {
      const idx = pair.indexOf('=');
      if (idx > -1) {
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (key) {
          try {
            req.cookies[key] = decodeURIComponent(value);
          } catch (err) {
            req.cookies[key] = value;
          }
        }
      }
    });
  }

  next();
}

module.exports = cookieParser;
