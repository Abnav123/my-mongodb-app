const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { ObjectId } = require("mongodb");

const { createApp } = require("../index");

function createMockCollection() {
  const docs = [];

  return {
    find() {
      return {
        limit() {
          return {
            toArray: async () => docs.slice(0, 200)
          };
        }
      };
    },
    async insertOne(doc) {
      const _id = new ObjectId();
      docs.push({ _id, ...doc });
      return { insertedId: _id };
    },
    async findOne(query) {
      const id = String(query._id);
      return docs.find((doc) => String(doc._id) === id) || null;
    },
    async deleteOne(query) {
      const id = String(query._id);
      const index = docs.findIndex((doc) => String(doc._id) === id);
      if (index === -1) return { deletedCount: 0 };
      docs.splice(index, 1);
      return { deletedCount: 1 };
    }
  };
}

function createTestApp() {
  const collection = createMockCollection();
  const app = createApp({
    getCollection: () => collection,
    appendTriggerData: async () => {},
    webhookSecret: ""
  });
  return app;
}

test("GET /api/cars returns 200 and array", async () => {
  const app = createTestApp();
  const res = await request(app).get("/api/cars");

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 0);
});

test("POST /api/cars with valid payload returns 201", async () => {
  const app = createTestApp();

  const payload = {
    owner_name: "Ada Wong",
    make: "Honda",
    model: "Civic",
    year: 2022,
    color: "Black",
    status: "ACTIVE"
  };

  const res = await request(app).post("/api/cars").send(payload);

  assert.equal(res.status, 201);
  assert.equal(res.body.owner_name, "Ada Wong");
  assert.equal(res.body.status, "ACTIVE");
  assert.ok(res.body._id);
});

test("POST /api/cars with missing required fields returns 400", async () => {
  const app = createTestApp();

  const res = await request(app).post("/api/cars").send({
    make: "Tesla",
    model: "Model 3",
    year: 2024,
    color: "White",
    status: "ACTIVE"
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /owner_name is required/i);
});

test("POST /api/cars with invalid status returns 400", async () => {
  const app = createTestApp();

  const res = await request(app).post("/api/cars").send({
    owner_name: "Ken",
    make: "Ford",
    model: "Mustang",
    year: 2020,
    color: "Red",
    status: "BROKEN"
  });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /status must be one of/i);
});

test("DELETE /api/cars/:id with invalid id returns 400", async () => {
  const app = createTestApp();
  const res = await request(app).delete("/api/cars/not-an-object-id");

  assert.equal(res.status, 400);
  assert.match(res.body.error, /invalid car id/i);
});
