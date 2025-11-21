import express from "express";
import "dotenv/config";

const app = express();
const PORT = process.env.TEST_SERVER_PORT || 4000;

app.use(express.json());

app.post("/webhook", (req, res) => {
  console.log("--- Received Webhook Event ---");
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("------------------------------");
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Test server listening on port ${PORT}`);
  console.log(`Target URL: http://localhost:${PORT}/webhook`);
});
