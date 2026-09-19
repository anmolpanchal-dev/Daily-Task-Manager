const mongoose = require("mongoose");
const Task = require("../models/Task");

const fields = ["title", "category", "priority", "minutes", "notes", "date", "status"];

function taskInput(body, partial = false) {
  const input = {};
  fields.forEach((field) => {
    if (!partial || Object.prototype.hasOwnProperty.call(body, field)) input[field] = body[field];
  });
  if (typeof input.title === "string") input.title = input.title.trim();
  if (typeof input.category === "string") input.category = input.category.trim();
  if (typeof input.notes === "string") input.notes = input.notes.trim();
  if (input.minutes !== undefined) input.minutes = Number(input.minutes);
  return input;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateInput(input, partial = false) {
  if (!partial || input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title || input.title.length > 200) return "Title is required and must be at most 200 characters.";
  }
  if (!partial || input.category !== undefined) {
    if (typeof input.category !== "string" || !input.category || input.category.length > 50) return "Category is required and must be at most 50 characters.";
  }
  if (
    (!partial && input.priority === undefined) ||
    (input.priority !== undefined && !["High", "Medium", "Low"].includes(input.priority))
  ) return "Priority must be High, Medium, or Low.";
  if (!partial || input.minutes !== undefined) {
    if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > 1440) return "Minutes must be a whole number from 1 to 1440.";
  }
  if (input.notes !== undefined && (typeof input.notes !== "string" || input.notes.length > 2000)) return "Notes must be at most 2000 characters.";
  if (!partial || input.date !== undefined) {
    if (!validDate(input.date)) return "Date must be a valid date in YYYY-MM-DD format.";
  }
  if (input.status !== undefined && !["pending", "completed"].includes(input.status)) return "Status must be pending or completed.";
  return null;
}

function ownedQuery(req, id) {
  return { _id: id, user: req.user._id };
}

async function listTasks(req, res, next) {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ date: 1, createdAt: -1 }).lean();
    res.json({ tasks });
  } catch (error) { next(error); }
}

async function createTask(req, res, next) {
  try {
    const input = taskInput(req.body || {});
    const message = validateInput(input);
    if (message) return res.status(400).json({ message });
    const task = await Task.create({ ...input, user: req.user._id });
    res.status(201).json({ task });
  } catch (error) { next(error); }
}

async function updateTask(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid task ID." });
    const input = taskInput(req.body || {}, true);
    const message = validateInput(input, true);
    if (message) return res.status(400).json({ message });
    const task = await Task.findOneAndUpdate(ownedQuery(req, req.params.id), input, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ message: "Task not found." });
    res.json({ task });
  } catch (error) { next(error); }
}

async function deleteTask(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid task ID." });
    const task = await Task.findOneAndDelete(ownedQuery(req, req.params.id));
    if (!task) return res.status(404).json({ message: "Task not found." });
    res.json({ message: "Task deleted successfully." });
  } catch (error) { next(error); }
}

async function updateStatus(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid task ID." });
    if (!["pending", "completed"].includes(req.body?.status)) return res.status(400).json({ message: "Status must be pending or completed." });
    const task = await Task.findOneAndUpdate(ownedQuery(req, req.params.id), { status: req.body.status }, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ message: "Task not found." });
    res.json({ task });
  } catch (error) { next(error); }
}

module.exports = { listTasks, createTask, updateTask, deleteTask, updateStatus };
