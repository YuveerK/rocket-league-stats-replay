import fs from "node:fs/promises";
import multer from "multer";
import { REPLAYS_DIR } from "../config/paths.js";

await fs.mkdir(REPLAYS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: REPLAYS_DIR,
  filename: (_req, file, cb) => cb(null, file.originalname),
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".replay")) {
      cb(null, true);
    } else {
      cb(new Error("Only .replay files are accepted"));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});
