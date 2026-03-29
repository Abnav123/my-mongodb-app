const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = "Carsd";
const TRIGGER_LOG_FILE = path.join(__dirname, "Trigger_data.txt");
const WEBHOOK_SECRET = process.env.TRIGGER_WEBHOOK_SECRET || "";
const ALLOWED_STATUS = new Set(["ACTIVE", "INACTIVE", "SERVICE"]);

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function validateCarPayload(body) {
  const memberId = normalizeText(body.member_id) || "AUTO-" + Date.now();
  const ownerName = normalizeText(body.owner_name);
  const make = normalizeText(body.make);
  const model = normalizeText(body.model);
  const color = normalizeText(body.color);
  const status = normalizeText(body.status || "ACTIVE").toUpperCase();
  const year = Number(body.year);

  if (!ownerName) {
    return { ok: false, error: "owner_name is required" };
  }
  if (!make) {
    return { ok: false, error: "make is required" };
  }
  if (!model) {
    return { ok: false, error: "model is required" };
  }
  if (!color) {
    return { ok: false, error: "color is required" };
  }
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    return { ok: false, error: "year must be an integer between 1900 and 2100" };
  }
  if (!ALLOWED_STATUS.has(status)) {
    return { ok: false, error: "status must be one of ACTIVE, INACTIVE, SERVICE" };
  }

  return {
    ok: true,
    value: {
      member_id: memberId,
      owner_name: ownerName,
      make,
      model,
      year,
      color,
      status,
      created_at: new Date()
    }
  };
}

function createApp({ getCollection, appendTriggerData, webhookSecret }) {
  const app = express();

  app.use(express.json());
  app.use(cors());

  app.get("/api/cars", async (req, res) => {
    try {
      const docs = await getCollection().find({}).limit(200).toArray();
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cars", async (req, res) => {
    try {
      const parsed = validateCarPayload(req.body || {});
      if (!parsed.ok) {
        return res.status(400).json({ error: parsed.error });
      }

      const car = parsed.value;
      const result = await getCollection().insertOne(car);
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
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid car id" });
      }

      const collection = getCollection();
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
      if (webhookSecret) {
        const incoming = req.get("x-trigger-secret") || "";
        if (incoming !== webhookSecret) {
          return res.status(401).json({ error: "Unauthorized trigger request" });
        }
      }

      const event = req.body || {};
      const operation = event.operationType || event.operation || "unknown";
      const carDoc = event.fullDocument || event.document || event.car || null;
      const carName = event.carName || getCarNameFromDoc(carDoc);
      const eventId = event.documentKey?._id || event.id || event.carId || event.sourceId || null;

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

  return app;
}

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

function startServer() {
  if (!MONGODB_URL) throw new Error("Missing MONGODB_URL or MONGODB_URI in .env");
  if (!DB_NAME) throw new Error("Missing DB_NAME in .env");

  const client = new MongoClient(MONGODB_URL);
  const clientReady = client.connect();

  const getCollection = () => client.db(DB_NAME).collection(COLLECTION_NAME);
  const app = createApp({
    getCollection,
    appendTriggerData,
    webhookSecret: WEBHOOK_SECRET
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

  process.on("beforeExit", async () => {
    try {
      await clientReady;
      await client.close();
    } catch {
      // Ignore close errors during process shutdown.
    }
  });

  return app;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  validateCarPayload,
  startServer,
  ALLOWED_STATUS
};
