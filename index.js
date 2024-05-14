const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.port || 5000;

//Middlewares
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://assignment11-736a2.web.app",
    "https://assignment11-736a2.firebaseapp.com",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "unauthorized access" });
      }
      console.log(decoded);
      req.user = decoded;
      next();
    });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vrdje6l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const foodsCollection = client.db("careKitchen").collection("foods");

    //jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    //add food to database
    app.post("/addFood", async (req, res) => {
      const foodData = req.body;
      console.log(foodData);
      const result = await foodsCollection.insertOne(foodData);
      res.send(result);
    });
    //get food data from database
    app.get("/food", async (req, res) => {
      const result = await foodsCollection
        .find()
        .sort({ foodQuantity: -1 })
        .toArray();
      res.send(result);
    });
    app.get("/food/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });
    app.put("/food/:id", async (req, res) => {
      const id = req.params.id;
      const foodData = req.body;
      console.log(foodData);
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...foodData,
        },
      };
      const result = await foodsCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });
    app.get("/availableFood", async (req, res) => {
      const sort = req.query.sort;
      const search = req.query.search;
      const query = {};
      if (search) {
        query.foodName = { $regex: search, $options: "i" };
      }
      const result = await foodsCollection
        .find(query)
        .sort({ expiredDate: sort === "dsc" ? 1 : -1 })
        .toArray();
      res.send(result);
    });

    app.get("/myFood/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const tokenEmail = req.user.email;
      console.log(tokenEmail);
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { "donor.email": email };
      const result = await foodsCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/myFood/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(query);
      res.send(result);
    });
    app.put("/update/:id", async (req, res) => {
      const foodData = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          foodName: foodData.foodName,
          foodImg: foodData.foodImg,
          foodQuantity: foodData.foodQuantity,
          pickupLocation: foodData.pickupLocation,
          expiredDate: foodData.expiredDate,
          notes: foodData.notes,
        },
      };
      const result = await foodsCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.get("/request/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      tokenEmail = req.user.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { userEmail: email };
      const result = await foodsCollection.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("CareKitchen sever is running");
});

app.listen(port, () => {
  console.log(`CareKitchen sever is listening on port ${port}`);
});
