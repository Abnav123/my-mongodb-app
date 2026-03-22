const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = "Carsd";
const TRIGGER_LOG_FILE = path.join(__dirname, "Trigger_data.txt");
const WEBHOOK_SECRET = process.env.TRIGGER_WEBHOOK_SECRET || "";

if (!MONGODB_URL) throw new Error("Missing MONGODB_URL or MONGODB_URI in .env");
if (!DB_NAME) throw new Error("Missing DB_NAME in .env");

const client = new MongoClient(MONGODB_URL);
const clientReady = client.connect();

app.use(express.json());
app.use(cors());

function getCarNameFromDoc(doc) {
  if (!doc) return "Unknown";
  if (doc.car_name && String(doc.car_name).trim()) return String(doc.car_name).trim();
  const make = doc.make ? String(doc.make).trim() : "";
  const model = doc.model ? String(doc.model).trim() : "";
  const combined = `${make} ${model}`.trim();
  return combined || "Unknown";
}

async function appendTriggerData({ source, operation, carName, id }) {
  const line = [
    new Date().toISOString(),
    source || "unknown",
    operation || "unknown",
    carName || "Unknown",
    id ? String(id) : "n/a"
  ].join(" | ") + "\n";

  await fs.appendFile(TRIGGER_LOG_FILE, line, "utf8");
}

app.get("/api/cars", async (req, res) => {
  try {
    await clientReady;
    const docs = await client.db(DB_NAME).collection(COLLECTION_NAME).find({}).limit(200).toArray();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/cars", async (req, res) => {
  try {
    await clientReady;
    const car = {
      member_id: req.body.member_id || "AUTO-" + Date.now(),
      owner_name: req.body.owner_name || "AI Garage",
      make: req.body.make || "Unknown",
      model: req.body.model || "Unknown",
      year: Number(req.body.year) || new Date().getFullYear(),
      color: req.body.color || "Silver",
      status: req.body.status || "ACTIVE",
      created_at: new Date()
    };

    const result = await client.db(DB_NAME).collection(COLLECTION_NAME).insertOne(car);
    await appendTriggerData({
      source: "api",
      operation: "insert",
      carName: getCarNameFromDoc(car),
      id: result.insertedId
    });
    res.status(201).json({ _id: result.insertedId, ...car });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/cars/:id", async (req, res) => {
  try {
    await clientReady;
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid car id" });
    }

    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
    const targetDoc = await collection.findOne({ _id: new ObjectId(id) });

    if (!targetDoc) {
      return res.status(404).json({ error: "Car not found" });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (!result.deletedCount) {
      return res.status(404).json({ error: "Car not found" });
    }

    await appendTriggerData({
      source: "api",
      operation: "delete",
      carName: getCarNameFromDoc(targetDoc),
      id
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/trigger-webhook", async (req, res) => {
  try {
    if (WEBHOOK_SECRET) {
      const incoming = req.get("x-trigger-secret") || "";
      if (incoming !== WEBHOOK_SECRET) {
        return res.status(401).json({ error: "Unauthorized trigger request" });
      }
    }

    const event = req.body || {};
    const operation = event.operationType || event.operation || "unknown";
    const carDoc = event.fullDocument || event.document || event.car || null;
    const carName = event.carName || getCarNameFromDoc(carDoc);
    const eventId =
      event.documentKey?._id ||
      event.id ||
      event.carId ||
      event.sourceId ||
      null;

    await appendTriggerData({
      source: "atlas-trigger",
      operation,
      carName,
      id: eventId
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "API is running",
    endpoint: "/api/cars"
  });
});

app.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});

process.on("SIGINT", async () => {
  try {
    await client.close();
  } finally {
    process.exit(0);
  }
});
