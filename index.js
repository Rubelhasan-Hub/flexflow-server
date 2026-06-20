const express = require('express');
const cors = require('cors');
const app = express()
const port = 5000
require('dotenv').config()

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.get('/', (req, res) => {
    res.send('Hello World!')
})


const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("flexflow_db");
        const classesCollection = database.collection("all_classes");



        app.post('/api/all-classes', async (req, res) => {
            const newClass = req.body;
            const result = await classesCollection.insertOne(newClass);
            res.send(result);
        });


        app.get('/api/all-classes', async (req, res) => {
            const query = {};

            if (req.query.status) {
                query.status = req.query.status;
            }
            if (req.query.search) {
                query.className = { $regex: req.query.search, $options: 'i' };
            }
            if (req.query.category) {
                const categoryArray = req.query.category.split(',');
                query.category = { $in: categoryArray };
            }

            const cursor = classesCollection.find(query);
            const allClasses = await cursor.toArray();
            res.send(allClasses);
        });


        // Add this to your server file
        app.get('/api/all-classes', async (req, res) => {
            try {
                // .find() gets all, .limit(3) restricts to first 3
                const result = await classesCollection.find().limit(3).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch classes" });
            }
        });

        app.get('/api/all-classes/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await classesCollection.findOne(query);

                if (!result) {
                    return res.status(404).send({ message: "Class not found" });
                }

                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching class details" });
            }
        });








        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {


        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);








app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})