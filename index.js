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
        const forumPostsCollection = database.collection("forum_posts");
        const commentsCollection = database.collection("comments");




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
            const { _id, ...updatedData } = req.body;

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


        app.delete('/api/forum-posts/:id', async (req, res) => {
            const result = await forumPostsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
            res.send(result);
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

                if (!application) {
                    return res.status(200).send({ status: 'none', message: "No application found" });
                }

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

        // Check Are user already booked...?
        app.get('/api/check-booking', async (req, res) => {
            try {
                const { classId, userEmail } = req.query;
                const booking = await bookingsCollection.findOne({ classId, userEmail });
                res.send({ isBooked: !!booking }); // true অথবা false পাঠাবে
            } catch (error) {
                res.status(500).send({ message: "Error checking booking" });
            }
        });








        // API For Admin----------------------


        app.post('/api/forum-posts', async (req, res) => {
            const post = req.body;
            const result = await forumPostsCollection.insertOne({
                ...post,
                likes: [],
                dislikes: [],
                createdAt: new Date()
            });
            res.send(result);
        });

        app.get('/api/forum-posts', async (req, res) => {
            const result = await forumPostsCollection.find().sort({ createdAt: -1 }).toArray();
            res.send(result);
        });

        app.get('/api/forum-posts/:id', async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) };
            const result = await forumPostsCollection.findOne(query);
            res.send(result);
        });

        app.patch('/api/forum-posts/:id/vote', async (req, res) => {
            const { id } = req.params;
            const { email, voteType } = req.body;
            await forumPostsCollection.updateOne({ _id: new ObjectId(id) }, {
                $pull: { likes: email, dislikes: email }
            });

            const update = voteType === 'like'
                ? { $addToSet: { likes: email } }
                : { $addToSet: { dislikes: email } };

            const result = await forumPostsCollection.updateOne({ _id: new ObjectId(id) }, update);
            res.send(result);
        });


        // Get all comments
        app.get('/api/comments/:postId', async (req, res) => {
            const comments = await commentsCollection.find({ postId: req.params.postId }).sort({ createdAt: -1 }).toArray();
            res.send(comments);
        });

        // Post new comment
        app.post('/api/comments', async (req, res) => {
            const comment = { ...req.body, createdAt: new Date() };
            const result = await commentsCollection.insertOne(comment);
            res.send(result);
        });

        // Delete comment
        app.delete('/api/comments/:id', async (req, res) => {
            const result = await commentsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
            res.send(result);
        });


        app.patch('/api/forum-posts/:id/vote', async (req, res) => {
            const { id } = req.params;
            const { email, voteType } = req.body; // voteType: 'like' বা 'dislike'

            const post = await forumPostsCollection.findOne({ _id: new ObjectId(id) });

            let updateQuery = {};

            if (voteType === 'like') {
                if (post.likes.includes(email)) {
                    updateQuery = { $pull: { likes: email } };
                } else {
                    updateQuery = { $addToSet: { likes: email }, $pull: { dislikes: email } };
                }
            } else if (voteType === 'dislike') {
                if (post.dislikes.includes(email)) {
                    updateQuery = { $pull: { dislikes: email } };
                } else {
                    updateQuery = { $addToSet: { dislikes: email }, $pull: { likes: email } };
                }
            }

            const result = await forumPostsCollection.updateOne({ _id: new ObjectId(id) }, updateQuery);
            res.send(result);
        });


        app.get('/api/user', async (req, res) => {
            const user = await client.db("flexflow_db").collection("user").find().toArray();
            res.send(user);
        });

        app.patch('/api/user/:id/status', async (req, res) => {
            const id = req.params.id;
            const { status } = req.body; // 'blocked' or 'active'
            const result = await client.db("flexflow_db").collection("user").updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: status } }
            );
            res.send(result);
        });

        app.patch('/api/user/:id/role', async (req, res) => {
            const id = req.params.id;
            const result = await client.db("flexflow_db").collection("user").updateOne(
                { _id: new ObjectId(id) },
                { $set: { role: 'admin' } }
            );
            res.send(result);
        });



        //  get trainer application 

        app.get('/api/trainer-applications', async (req, res) => {
            try {
                const applications = await trainerApplicationCollection.find().toArray();
                res.send(applications);
            } catch (error) {
                res.status(500).send({ message: "Failed to fetch applications" });
            }
        });

        app.patch('/api/trainer-applications/:id', async (req, res) => {
            const { id } = req.params;
            const { status, feedback } = req.body;
            await client.db("flexflow_db").collection("trainer_apply").updateOne(
                { _id: new ObjectId(id) },
                { $set: { status, feedback } }
            );

            if (status === 'approved') {
                const app = await client.db("flexflow_db").collection("trainer_apply").findOne({ _id: new ObjectId(id) });
                await client.db("flexflow_db").collection("user").updateOne(
                    { email: app.userEmail },
                    { $set: { role: 'trainer' } }
                );
            }
            res.send({ success: true });
        });


        app.patch('/api/classes/:id', async (req, res) => {
            const id = req.params.id;
            const { status } = req.body; 

            const result = await classesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: status } }
            );
            res.send(result);
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