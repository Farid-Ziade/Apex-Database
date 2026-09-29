import express from "express";
import "dotenv/config";
import NodeCache from "node-cache";
import { MongoClient, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const client = new MongoClient(process.env.connect);
const cache = new NodeCache();
let userCollection;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    cb(null, `users-${req.params.id}${extension}`);
  },
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 2 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, and PNG files are allowed"));
    }
  },
});

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
  const cachedUsers = cache.get("users:all");

  if (cachedUsers) {
    console.log("cache refreshed");
    return res.json(cachedUsers);
  }

  console.log("Users retrieved from MongoDB");

  const users = await userCollection.find().toArray();

  cache.set("users:all", users);

  res.json(users);
});

app.post("/users", async (req, res) => {
  const user = req.body;

  const result = await userCollection.insertOne(user);

  cache.del("users:all");

  console.log("users:all cache deleted");

  res.json({
    message: "User added",
    id: result.insertedId,
  });
});

app.put("/users/:id", async (req, res) => {
  const id = req.params.id;
  const updatedUser = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  await userCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedUser },
  );

  cache.del(`user:${id}`);
  cache.del(`users:all`);

  console.log(`user:${id} cache invalidated`);

  res.json({ message: "User updated" });
});

app.delete("/users/:id", async (req, res) => {
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  const users = await userCollection.find().toArray();

  const result = await userCollection.deleteOne({
    _id: new ObjectId(id),
  });

  if (result.deletedCount === 0) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  cache.set("users:all", users, 30);

  console.log("User deleted from MongoDB");
  console.log("Old users list cached for 30 seconds");

  res.json({
    message: "User deleted",
  });
});

app.post("/api/auth/token", (req, res) => {
  const token = jwt.sign(
    {
      access: "users",
    },
    process.env.jwt,
    {
      expiresIn: "1h",
    },
  );

  res.json({
    token: token,
  });
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.jwt);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
}

app.get("/api/users", verifyToken, async (req, res) => {
  const users = await userCollection.find().toArray();

  res.json(users);
});

app.post(
  "/users/:id/profile-picture",
  upload.single("profilePicture"),
  async (req, res) => {
    const id = req.params.id;

    if (!req.file) {
      return res.status(400).json({
        message: "No file provided",
      });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    await userCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          profilePicture: imagePath,
        },
      },
    );

    res.json({
      message: "Profile picture uploaded successfully",
      image: imagePath,
    });
  },
);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File is too large. Maximum size is 2 MB.",
      });
    }
  }

  if (err) {
    return res.status(400).json({
      message: err.message,
    });
  }

  next();
});

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  const user = await userCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.json(user);
});

connectToMongoDB();
