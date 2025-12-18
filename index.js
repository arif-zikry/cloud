const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const path = require('path');
const port = 3000;
const saltRounds = 10;

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

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const authorize = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) 
        return res.status(403).json({ error: 'Forbidden' });
    next();
};

app.post('/auth/login', async (req, res) => {
    const user = await db.collection('users').findOne({ email: req.body.email });

    if(!user||!(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({ token });
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

app.delete('/admin/users/:id', authenticate, authorize(['admin']), async (req, res) => {
    console.log("Admin only");
    res.status(200).json({ message: 'admin access' });
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
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        const user = {...req.body, password: hashedPassword};
        const result = await db.collection('users').insertOne(user);
        res.status(201).json({ message: "User created with id " + result.insertedId });
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