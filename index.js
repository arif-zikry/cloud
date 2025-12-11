const { MongoClient } = require('mongodb');
import { ObjectId } from 'bson';
const express = require('express');
const path = require('path');
const port = 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'web')));

let db;

async function ConnectToMongoDB() {
    const uri = "mongodb://localhost:27017"
    const client =  new MongoClient(uri);

    try {
        await client.connect();

        console.log("Connected to MongoDB!");

        db = client.db("RideShareDB");
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

// Administration

//login
app.post('/admin', async (req, res) => {
    const { username, password } = req.body;
    
    if (await db.collection('admins').findOne({ username, password }))
        {
            res.status(200).json({ message: 'Login successful' });
        }
    else 
        {
            res.status(401).json({ error: 'Invalid credentials' });
        }
});

//View Transactions
app.get('/transactions', async (req, res) => {

    driverid = "";

    if(req.query.DriverID) {
        driverid = req.query.DriverID;
        try {
        const transactions = await db.collection('transactions').find({DriverID: driverid}).toArray();
        res.status(200).json(transactions);}
        catch (err) {
        res.status(404).json({ error: 'Failed to fetch transactions' });
    }}

    else{
    try {
            const transactions = await db.collection('transactions').find().toArray();
            res.status(200).json(transactions);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch transactions' });
    }
     
    }
});

//Edit transactions
app.patch('/transactions/:id', async (req, res) => {
    try {
        const result = await db.collection('transactions').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { amount: req.body.amount, status: req.body.status } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.status(200).json({ updated: result.modifiedCount});

    } catch (err) {
        res.status(500).json({ error: 'Invalid Transaction ID or data' });
    }
});

//Create Transaction
app.post('/transactions', async (req, res) => {
    try {
        const result = await db.collection('transactions').insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid Transaction Data' });
    }
});

//View Rides
app.get('/rides', async (req,res) =>{
    try{
        const rides = await db.collection('rides').find().toArray();
        res.status(200).json(rides);
    }
    catch (err){
        res.status(500).json({error: 'Error'})
    }
})

//Manage Users (delete)
app.delete('/users/:id', async (req,res) => {
    try{
        const result = await db.collection('users').deleteOne(
            {
                _id : new bjectId(req.params.id)
            }
        )
            if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ deleted: result.deletedCount});
    
    }   catch (err) {
        res.status(500).json({ error: 'Invalid user ID' });
    }
})

//Manage Drivers (delete)
app.delete('/drivers/:id', async (req,res) => {
    try{
        const result = await db.collection('drivers').deleteOne(
            {
                _id : new ObjectId(req.params.id)
            }
        )
            if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        res.status(200).json({ deleted: result.deletedCount});
    
    }   catch (err) {
        res.status(500).json({ error: 'Invalid driver ID' });
    }
})



// Drivers
//Register Driver
app.post('/drivers', async (req, res) => {
    try {
        const result = await db.collection('drivers').insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid Driver Data' });
    }
});

//Get all drivers
app.get('/drivers', async (req, res) => {
    try {
        const drivers = await db.collection('drivers').find().toArray();
        res.status(200).json(drivers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

//Update driver status
app.patch('/drivers/:id', async (req, res) => {
    try {
        const result = await db.collection('drivers').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { isAvailable: req.body.isAvailable } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        res.status(200).json({ updated: result.modifiedCount});

    } catch (err) {
        res.status(500).json({ error: 'Invalid Driver ID or data' });
    }
});

// Check Profile
app.get('/drivers/:id', async (req, res) => {
    try {
        const driver = await db.collection('drivers').findOne(
            { _id: new ObjectId(req.params.id) }
        );

        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        res.status(200).json(driver);
    } catch (err) {
        res.status(500).json({ error: 'Invalid Driver ID' });
    }
});

//Accept/Refuse Ride
app.patch('/rides/:id', async (req,res) => {
    try{
        const result = await db.collection('rides').updateOne(
            { _id : new ObjectId(req.params.id)},
            { $set : {status : (req.body.status)}}
        )

        if (result.modifiedCount === 0){
            return res.status(404).json({error: 'Ride not found' });
        }
        res.status(200).json({updated: result.modifiedCount});
    }   catch (err) {
        res.status(500).json({ error: 'Invalid ride ID'});
    }
})

//Complete Ride
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

//View driver Transactions  (no clue)
// app.get('/driver/transactions', async (req, res) => {

//     if (!req.body.driverid) {
//         driverid = "";
//     }
//     else {
//         driverid = req.body.driverid;
//     }

//     try {
//         const transactions = await db.collection('transactions').find(
//             { DriverID: driverid }
//         ).toArray();
        

//         if(transactions.length === 0) {
//             return res.status(404).json({ error: 'Transactions not found' });
//         }
//         res.status(200).json(transactions);
//     } catch (err) {
//         res.status(500).json({ error: 'Invalid Driver ID' });
//     }
// });

app.get('/logs/drivers/:id', async (req, res) => {
    try {
        const logs = await db.collection('logs').find(
            { driverId: req.params.id }
        ).toArray();

        if(!logs) {
            return res.status(404).json({ error: 'Logs not found' });
        }
        res.status(200).json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Invalid Driver ID' });
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

//rides

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