const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['https://joyful-lokum-eabe50.netlify.app'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x5y82lv.mongodb.net/?retryWrites=true&w=majority`;

// MongoDB connection
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const taskCollection = client.db("taskDB").collection("tasks");

        // Custom middlewares
        const logger = async (req, res, next) => {
            console.log('called: ', req.hostname, req.originalUrl);
            console.log('log: info', req.method, req.url);
            next();
        }

        const verifyToken = async (req, res, next) => {
            const token = req?.cookies?.token;
            // console.log('Token in the middleware: ', token);

            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' });
            }

            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' });
                }

                req.decoded = decoded;
                next();
            })
        }

        // Auth related APIs
        try {
            app.post('/jwt', logger, async (req, res) => {
                const user = req.body;
                console.log('User: ', user);

                const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: '1h'
                });

                res
                    .cookie('token', token, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'none',
                        maxAge: 24 * 60 * 60 * 1000   // 24 hours
                    })
                    .send({ success: true });
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.post('/logout', async (req, res) => {
                const user = req.body;
                console.log('Logging out', user);
                res.clearCookie('token', { maxAge: 0 }).send({ success: true });
            })
        }
        catch (error) {
            console.log(error);
        }

        // Tasks related APIs
        try {
            app.get('/api/v1/tasks', logger, verifyToken, async (req, res) => {
                if (req.query.email !== req.decoded.email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }

                const email = req.query.email;
                const query = { email: email };
                const cursor = taskCollection.find(query);
                const result = await cursor.sort({ timestamp: -1 }).toArray();
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.get('/api/v1/task/:id', async (req, res) => {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await taskCollection.findOne(query);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.post('/api/v1/add-task', logger, verifyToken, async (req, res) => {
                console.log(req.query.email);
                // console.log('Token', req.cookies.token);
                console.log('User of the valid token', req.decoded);

                if (req.query.email !== req.decoded.email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }

                const newTask = req.body;
                newTask.timestamp = new Date();
                console.log(newTask);
                const result = await taskCollection.insertOne(newTask);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.patch('/api/v1/update-task/:id', logger, verifyToken, async (req, res) => {
                console.log(req.query.email);
                // console.log('Token', req.cookies.token);
                console.log('User of the valid token', req.decoded);

                if (req.query.email !== req.decoded.email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }

                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updatedTask = req.body;

                const task = {
                    $set: {
                        title: updatedTask.title,
                        description: updatedTask.description,
                        deadline: updatedTask.deadline,
                        priority: updatedTask.priority,
                        status: 'to-do',
                        timestamp: new Date(),
                        email: updatedTask.email
                    }
                }

                const result = await taskCollection.updateOne(filter, task);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.patch('/api/v1/task/status-ongoing/:id', logger, verifyToken, async (req, res) => {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updatedDoc = {
                    $set: {
                        status: 'ongoing',
                        ongoingDate: new Date()
                    }
                }
                const result = await taskCollection.updateOne(filter, updatedDoc);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.patch('/api/v1/task/status-completed/:id', logger, verifyToken, async (req, res) => {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updatedDoc = {
                    $set: {
                        status: 'completed',
                        completedDate: new Date()
                    }
                }
                const result = await taskCollection.updateOne(filter, updatedDoc);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        try {
            app.delete('/api/v1/delete-task/:id', logger, verifyToken, async (req, res) => {
                console.log(req.query.email);
                // console.log('Token', req.cookies.token);
                console.log('User of the valid token', req.decoded);

                if (req.query.email !== req.decoded.email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }

                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await taskCollection.deleteOne(query);
                res.send(result);
            })
        }
        catch (error) {
            console.log(error);
        }

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Task management app server is running');
})

app.listen(port, () => {
    console.log(`Task management app server is running on port: ${port}`);
})