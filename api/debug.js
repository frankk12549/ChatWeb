module.exports = async function handler(req, res) {
  const body = req.body || {};
  return res.status(200).json({
    method: req.method,
    bodyType: typeof req.body,
    bodyIsNull: req.body === null,
    bodyIsUndefined: req.body === undefined,
    bodyStr: typeof req.body === "string" ? req.body.substring(0, 500) : JSON.stringify(req.body).substring(0, 500),
    contentType: req.headers["content-type"] || "",
    contentLength: req.headers["content-length"] || ""
  });
};
