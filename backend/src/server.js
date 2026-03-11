import dotenv from "dotenv";
import { createApp } from "./app.js";
import { getStoreProviderName, initializeStore } from "./store.js";

dotenv.config({ quiet: true });

const app = createApp();
const PORT = Number(process.env.PORT) || 8080;

try {
  await initializeStore();

  app.listen(PORT, () => {
    console.log(
      `EnglishBuddy backend listening on port ${PORT} using ${getStoreProviderName()} storage`,
    );
  });
} catch (error) {
  console.error("Failed to start EnglishBuddy backend.");
  console.error(error);
  process.exit(1);
}
