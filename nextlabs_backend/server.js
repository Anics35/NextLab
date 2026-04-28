const { createServer } = require("http");
const app = require("./backend/app");
const { connectDatabase } = require("./backend/config/db");
const { initSocket } = require("./backend/socket");

const PORT = process.env.PORT || 5001;

async function startServer() {
  await connectDatabase();

  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`NexLab backend running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start NexLab backend:", error.message);
  process.exit(1);
});
