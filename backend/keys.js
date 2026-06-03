import { readFile } from "fs/promises";

async function inspectDeepJSON() {
  try {
    const rawData = await readFile("replay-network.json", "utf8");
    const jsonObject = JSON.parse(rawData);

    console.log(
      "=== STEP 1: ALL PROPERTIES KEYS (Match Settings & Metadata) ===",
    );
    if (jsonObject.properties) {
      Object.keys(jsonObject.properties).forEach((propKey) => {
        const propValue = jsonObject.properties[propKey];
        console.log(
          `Property: "${propKey}" ->`,
          JSON.stringify(propValue).substring(0, 100),
        );
      });
    }

    console.log("\n=== STEP 2: NETWORK FRAMES STRUCTURE (Gameplay Data) ===");
    if (jsonObject.network_frames && jsonObject.network_frames.frames) {
      const totalFrames = jsonObject.network_frames.frames.length;
      console.log(`Total Gameplay Frames Found: ${totalFrames}`);

      if (totalFrames > 0) {
        const firstFrame = jsonObject.network_frames.frames[1100];
        console.log("\nStructure of the very first Frame (Frame 0):");
        console.log(JSON.stringify(firstFrame, null, 2));
      }
    }
  } catch (error) {
    console.error("Error reading or parsing file:", error);
  }
}

inspectDeepJSON();
