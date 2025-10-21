import express from "express";
const router = express.Router();

router.get("/", (_, res) => {
  res.send("Backend server is healthy");
});

export default router;
