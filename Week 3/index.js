// Week 3

const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const path = require('path');
const port = 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

async function ConnectToMongoDB() {
    const uri = "mongodb://localhost:27017"
    const client =  new MongoClient(uri);

    try {
        await client.connect();

        console.log("Connected to MongoDB!");

        db = client.db("testDB");
    }   
        catch(err) {
        console.error("Error:", err);
    }
}

ConnectToMongoDB();

app.listen(port, () => {
    console.log(`Express server is running on port: ${port}`);
});

app.get('/', (req, res) => {
    res.send('Welcome to the Ride Sharing Service API');
});

// Drivers

app.get('/rides', async (req, res) => {
    try {
        const rides = await db.collection('rides').find().toArray();
        res.status(200).json(rides);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rides' });
    }
});

app.post('/rides', async (req, res) => {
    try {
        const result = await db.collection('rides').insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid Ride Data' });
    }
});

app.patch('/rides/:id', async (req, res) => {
    try {
        const result = await db.collection('rides').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: req.body.status } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Ride not found' });
        }
        res.status(200).json({ updated: result.modifiedCount});

    } catch (err) {
        res.status(500).json({ error: 'Invalid ride ID or data' });
    }
});

app.delete('/rides/:id', async (req, res) => {
    try{
        const result = await db.collection('rides').deleteOne(
            { _id: new ObjectId(req.params.id) }
        );

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Ride not found' });
        }
        res.status(200).json({ deleted: result.deletedCount});
    
    }   catch (err) {
        res.status(500).json({ error: 'Invalid ride ID' });
    }
});

// Users

app.get('/users', async (req, res) => {
    try {
        const users = await db.collection('users').find().toArray();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/users', async (req, res) => {
    try {
        const result = await db.collection('users').insertOne(req.body);
        res.status(201).json({ id: result.InsertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid User Data' });
    }
});

app.patch('/users/:id', async (req, res) => {
    try {
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: req.body.status } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ updated: result.modifiedCount});

    } catch (err) {
        res.status(500).json({ error: 'Invalid User ID or data' });
    }
});

app.delete('/users/:id', async (req, res) => {
    try{
        const result = await db.collection('users').deleteOne(
            { _id: new ObjectId(req.params.id) }
        );

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ deleted: result.deletedCount});
    
    }   catch (err) {
        res.status(500).json({ error: 'Invalid User ID' });
    }
});