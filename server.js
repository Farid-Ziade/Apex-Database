import express from "express";
import "dotenv/config";

import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(express.json());
app.use(express.static("public"));
const client = new MongoClient(process.env.connect);

let userCollection;

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    const database = client.db("apex");
    userCollection = database.collection("users");
    app.listen(3000, () => {
      console.log(`Server Started`);
    });
  } catch (err) {
    console.dir(err);
  }
}

export async function disconnectFromMongoDB() {
  await client.close();
}

app.get("/users", async (req, res) => {
  const users = await userCollection.find().toArray();

  res.json(users);
});
app.post("/users", async (req, res) => {
  const user = req.body;

  const result = await userCollection.insertOne(user);

  res.json({
    message: "User added",
    id: result.insertedId,
  });
});
app.delete("/users/:id", async (req, res) => {
  const id = req.params.id;

  await userCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.json({ message: "User deleted" });
});
app.put("/users/:id", async (req, res) => {
  const id = req.params.id;
  const updatedUser = req.body;

  await userCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedUser },
  );

  res.json({ message: "User updated" });
});
app.delete("/users", async (req, res) => {
  try {
    await userCollection.deleteMany({});

    res.status(200).json({ message: "All users deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting users" });
  }
});
connectToMongoDB();
