import express from "express";
import multer from "multer";
import { transcribeAudio } from "../controllers/transcribe.controllers";
import { login, register } from "../controllers/auth.controllers";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/login", login);
router.post("/register", register);

export default router;
