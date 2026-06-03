import { app } from "./src/app.js";

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, () => {
  console.log(`Replay API running at http://localhost:${PORT}`);
});
