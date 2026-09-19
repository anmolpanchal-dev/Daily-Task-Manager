const express = require("express");
const protect = require("../middleware/authMiddleware");
const { register, login, me, logout } = require("../controllers/authController");

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
// JWTs are stateless; the client discards its token on logout.
router.post("/logout", logout);

module.exports = router;
