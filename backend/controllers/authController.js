const jwt = require("jsonwebtoken");
const User = require("../models/User");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tokenFor(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function credentials(body) {
  return {
    name: typeof body.name === "string" ? body.name.trim() : "",
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    password: typeof body.password === "string" ? body.password : "",
  };
}

async function register(req, res, next) {
  try {
    const { name, email, password } = credentials(req.body || {});
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: "Name must be 2-80 characters." });
    if (!emailPattern.test(email)) return res.status(400).json({ message: "A valid email is required." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    if (await User.exists({ email })) return res.status(409).json({ message: "An account with that email already exists." });
    const user = await User.create({ name, email, password });
    res.status(201).json({ user: user.toSafeObject(), token: tokenFor(user) });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = credentials(req.body || {});
    if (!emailPattern.test(email) || !password) return res.status(400).json({ message: "Email and password are required." });
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: "Invalid email or password." });
    res.json({ user: user.toSafeObject(), token: tokenFor(user) });
  } catch (error) {
    next(error);
  }
}

function me(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

function logout(req, res) {
  res.json({ message: "Logged out successfully." });
}

module.exports = { register, login, me, logout };
