const express = require("express");
const protect = require("../middleware/authMiddleware");
const { listTasks, createTask, updateTask, deleteTask, updateStatus } = require("../controllers/taskController");

const router = express.Router();
router.use(protect);
router.route("/").get(listTasks).post(createTask);
router.route("/:id").put(updateTask).delete(deleteTask);
router.patch("/:id/status", updateStatus);

module.exports = router;
