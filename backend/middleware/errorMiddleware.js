function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.name === "ValidationError") {
    const details = Object.values(error.errors).map((item) => item.message);
    return res.status(400).json({ message: "Validation failed.", errors: details });
  }
  if (error.code === 11000) return res.status(409).json({ message: "An account with that email already exists." });
  if (error.name === "CastError") return res.status(400).json({ message: "Invalid resource ID." });
  console.error(error);
  res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Internal server error." });
}

module.exports = { notFound, errorHandler };
