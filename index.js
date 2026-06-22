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
        const bookingsCollection = database.collection("bookings");
        const favoritesCollection = database.collection("favorites");
        const trainerApplicationCollection = database.collection("trainer_apply");




        // API For trainer----------------------
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

        // Get classes by trainer email
        app.get('/api/my-classes/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const query = { trainerEmail: email }; // আপনার ডাটাবেস ফিল্ডের নাম 'trainerEmail' ই তো?
                const result = await classesCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Server error" });
            }
        });


        // Update class details
        app.patch('/api/classes/:id', async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;

            const result = await classesCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: updatedData
                }
            );

            res.send(result);
        });

        // Delete a class
        app.delete('/api/classes/:id', async (req, res) => {
            const id = req.params.id;

            const result = await classesCollection.deleteOne({
                _id: new ObjectId(id)
            });

            res.send(result);
        });


        app.get('/api/class-students/:id', async (req, res) => {
            const classId = req.params.id;

            const result = await bookingsCollection
                .find({ classId })
                .toArray();

            res.send(result);
        });

        app.post('/api/bookings', async (req, res) => {
            try {
                const bookingData = req.body;
                const result = await bookingsCollection.insertOne(bookingData);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to save booking" });
            }
        });








        // API For Users----------------------

        // get the booking data my user email
        app.get('/api/my-bookings/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const query = { userEmail: email };
                const result = await bookingsCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Error fetching your bookings" });
            }
        });



        // Add to favorite route
        app.post('/api/favorites', async (req, res) => {
            try {
                const { classId, userEmail, classDetails } = req.body;
                const isExists = await favoritesCollection.findOne({
                    classId: classId,
                    userEmail: userEmail
                });

                if (isExists) {
                    return res.status(400).send({ message: "Already in favorites" });
                }

                const result = await favoritesCollection.insertOne({
                    classId,
                    userEmail,
                    classDetails
                });
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Internal Server Error" });
            }
        });

        // Get favorites for specific user
        app.get('/api/favorites/:email', async (req, res) => {
            const email = req.params.email;
            const result = await favoritesCollection.find({ userEmail: email }).toArray();
            res.send(result);
        });

        // Remove from favorites
        app.delete('/api/favorites/:id', async (req, res) => {
            const id = req.params.id;
            const result = await favoritesCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        // Apply for trainer 
        app.post('/api/trainer_apply', async (req, res) => {
            try {
                const applicationData = req.body;
                const alreadyApplied = await trainerApplicationCollection.findOne({ userEmail: applicationData.userEmail });

                if (alreadyApplied) {
                    return res.status(400).send({ message: "You have already applied!" });
                }

                const result = await trainerApplicationCollection.insertOne({
                    ...applicationData,
                    status: 'pending',
                    createdAt: new Date()
                });
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "Failed to submit application" });
            }
        });


        // Get application 


        app.get('/api/trainer_apply/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const application = await trainerApplicationCollection.findOne({ userEmail: email });
                res.send(application);
            } catch (error) {
                res.status(500).send({ message: "Error fetching status" });
            }
        });

        app.get('/api/user-stats/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const bookedCount = await bookingsCollection.countDocuments({ userEmail: email });
                const favoriteCount = await favoritesCollection.countDocuments({ userEmail: email });

                res.send({ bookedCount, favoriteCount });
            } catch (error) {
                res.status(500).send({ message: "Error fetching stats" });
            }
        });








        // API For Admin----------------------








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