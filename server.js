import express from "express";
import "dotenv.config()";

import { MongoClient } from "mongodb";

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

app.post("/users", async (req, res) => {
  const user = req.body;
  await userCollection.insertOne(user);
  res.json({ message: "user added " });
});
app.get("/users", async (req, res) => {
  const users = await userCollection.find().toArray();
  res.json(users);
});
app.put("/users/:firstname", async (req, res) => {
  const firstname = req.params.firstname;
  const updatedUser = req.body;
  await userCollection.updateOne(
    {
      firstname: firstname,
    },
    { $set: updatedUser },
  );
  res.json({ message: "user updated" });
});
app.delete("/users/:firstname", async (req, res) => {
  const firstname = req.params.firstname;
  await userCollection.deleteOne({ firstname: firstname });
  res.json({ message: "user deleted " });
});
connectToMongoDB();
