import express from "express";
import cors from "cors";
import replayRoutes from "./routes/replay.routes.js";
import heatmapRoutes from "./routes/heatmap.routes.js";
import viewerRoutes from "./routes/viewer.routes.js";
import ballRoutes from "./routes/ball.routes.js";
import boostRoutes from "./routes/boost.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import careerRoutes from "./routes/career.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", heatmapRoutes);
app.use("/api", replayRoutes);
app.use("/api", viewerRoutes);
app.use("/api", ballRoutes);
app.use("/api", boostRoutes);
app.use("/api", statsRoutes);
app.use("/api", careerRoutes);

app.use(errorHandler);

export { app };
