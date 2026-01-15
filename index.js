const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');

//Security
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

//Configuration
const path = require('path');
const port = process.env.PORT || 3000;
const saltRounds = 10;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'web')));

let db;

if (!process.env.MONGODBATLAS_CLUSTER_CONNECTIONSTRING) {
    throw new Error("MONGODBATLAS_CLUSTER_CONNECTIONSTRING is not set");
}

async function ConnectToMongoDB() {
    const uri = process.env.MONGODBATLAS_CLUSTER_CONNECTIONSTRING;
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

const authorizebyId = (id) => (req, res, next) => {
    if (!id.includes(req.user.userId)) 
        return res.status(403).json({ error: 'Who are you?' });
    next();
};

////////////////////////////Login//////////////////////////////////////////

app.post('/auth/login', async (req, res) => {
    // console.log(process.env.JWT_SECRET);
    const user = await db.collection('users').findOne({ email: req.body.email });

    if(!user||!(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
        { userId: user._id.toString(), role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({ token });
});

////////////////////////////Administration//////////////////////////////////////////

//create admin
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
    try {
        const result = await db.collection('admin').deleteOne(
            { _id: new ObjectId(req.params.id) }
        );
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(200).json({ deleted: result.deletedCount, message: 'admin deleted'});
    } catch (err) {
        res.status(500).json({ error: 'Invalid admin ID' });
    }
});

//View Transactions
app.get('/transactions', authenticate, authorize(['admin']), async (req, res) => {

    const driverid = req.query.DriverID;

    if(driverid) {
        try {
        const transactions = await db.collection('transactions').find({driverID: parseInt(driverid)}).toArray();
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
app.patch('/transactions/:id', authenticate, authorize(['admin']),async (req, res) => {
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
app.post('/transactions', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const result = await db.collection('transactions').insertOne(req.body);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid Transaction Data' });
    }
});

//View Rides
app.get('/rides', authenticate, authorize(['admin', 'user', 'driver']), async (req,res) =>{
    try{
        const rides = await db.collection('rides').find().toArray();
        res.status(200).json(rides);
    }
    catch (err){
        res.status(500).json({error: 'Error'})
    }
})

//Manage Drivers (delete)
app.delete('/drivers/:id', authenticate, authorize(['admin']),async (req,res) => {
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

//Delete Ride
app.delete('/rides/:id', authenticate, authorize(['admin']), async (req, res) => {
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


////////////////////////////Drivers//////////////////////////////////////////
//Register Driver
app.post('/drivers', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        const user = {...req.body, password: hashedPassword};
        const result = await db.collection('drivers').insertOne(user);
        res.status(201).json({ message: "Driver created with id " + result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid Driver Data' });
    }
});

//Get all drivers
app.get('/drivers', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const drivers = await db.collection('drivers').find().toArray();
        res.status(200).json(drivers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

//Update driver status
app.patch('/drivers/:id', authenticate, authorize(['admin', 'driver']), async (req, res) => {
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
app.get('/drivers/:id', authenticate, authorize(['admin', 'driver']), async (req, res) => {
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

//Accept/Refuse/complete Ride
app.patch('/rides/:id', authenticate, authorize(['admin', 'driver', 'user']), async (req,res) => {
    try{
        // Build update object from request body
        const updateFields = {};
        if (req.body.status) updateFields.status = req.body.status;
        if (req.body.driverID) updateFields.driverID = req.body.driverID;
        if (req.body.vehicleID) updateFields.vehicleID = req.body.vehicleID;
        if (req.body.acceptedAt) updateFields.acceptedAt = req.body.acceptedAt;
        if (req.body.startedAt) updateFields.startedAt = req.body.startedAt;
        if (req.body.completedAt) updateFields.completedAt = req.body.completedAt;
        
        const result = await db.collection('rides').updateOne(
            { _id : new ObjectId(req.params.id)},
            { $set : updateFields }
        )

        if (result.modifiedCount === 0){
            return res.status(404).json({error: 'Ride not found' });
        }
        
        // Update driver status based on ride status
        if (req.body.driverID && req.body.status) {
            if (req.body.status === 'ongoing') {
                // Set driver to busy when ride starts
                await db.collection('drivers').updateOne(
                    { _id: new ObjectId(req.body.driverID) },
                    { $set: { status: 'busy' } }
                );
            } else if (req.body.status === 'completed') {
                // Set driver to available when ride completes
                await db.collection('drivers').updateOne(
                    { _id: new ObjectId(req.body.driverID) },
                    { $set: { status: 'available' } }
                );
            }
        }
        
        res.status(200).json({updated: result.modifiedCount});
    }   catch (err) {
        res.status(500).json({ error: 'Invalid ride ID'});
    }
})

////////////////////////////Vehicles//////////////////////////////////////////

// Get all vehicles
app.get('/vehicles', authenticate, authorize(['admin', 'driver']), async (req, res) => {
    try {
        const vehicles = await db.collection('vehicles').find().toArray();
        res.status(200).json(vehicles);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
});

// Add or update vehicle
app.post('/vehicles', authenticate, authorize(['driver']), async (req, res) => {
    try {
        const { driverID, make, model, year, licensePlate, color, capacity } = req.body;
        
        // Check if driver already has a vehicle
        const existing = await db.collection('vehicles').findOne({ driverID });
        
        if (existing) {
            // Update existing vehicle
            const result = await db.collection('vehicles').updateOne(
                { driverID },
                { $set: { make, model, year, licensePlate, color, capacity, updatedAt: new Date() } }
            );
            res.status(200).json({ message: 'Vehicle updated successfully', _id: existing._id });
        } else {
            // Insert new vehicle
            const vehicle = { driverID, make, model, year, licensePlate, color, capacity, createdAt: new Date() };
            const result = await db.collection('vehicles').insertOne(vehicle);
            res.status(201).json({ message: 'Vehicle registered successfully', _id: result.insertedId });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to register vehicle' });
    }
});

// Delete vehicle
app.delete('/vehicles/:id', authenticate, authorize(['driver', 'admin']), async (req, res) => {
    try {
        const result = await db.collection('vehicles').deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.status(200).json({ deleted: result.deletedCount, message: 'Vehicle deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Invalid vehicle ID' });
    }
});

app.post('/drivers/vehicles', authenticate, authorize(['driver']), async (req, res) => {
    try {
        const vehicle = { ...req.body, driver_id: req.user.userId };
        const result = await db.collection('vehicles').insertOne(vehicle);
        res.status(201).json({ message: "Vehicle added with id " + result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid Vehicle Data' });
    }
});

app.delete('/drivers/vehicles/:id', authenticate, authorize(['driver']), async (req, res) => {
    try {
        const result = await db.collection('vehicles').deleteOne(
            { _id: new ObjectId(req.params.id), driver_id: req.user.userId }
        );
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.status(200).json({ deleted: result.deletedCount, message: 'vehicle deleted'});
    } catch (err) {
        res.status(500).json({ error: 'Invalid Vehicle ID' });
    }
});

////////////////////////////Users//////////////////////////////////////////

//get users
app.get('/users', authenticate, authorize(['admin', 'driver']), async (req, res) => {
    try {
        const users = await db.collection('users').find().toArray();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

//get single user by id
app.get('/users/:id', authenticate, async (req, res) => {
    try {
        // Allow users to access their own profile or admins to access any profile
        if (req.user.role !== 'admin' && req.user.userId.toString() !== req.params.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(req.params.id) }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: 'Invalid User ID' });
    }
});

//create user
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

//update user status
app.patch('/users/:id', authenticate, async (req, res) => {
    // Allow users to update their own profile or admins to update any profile
    if (req.user.role !== 'admin' && req.user.userId.toString() !== req.params.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    try {
        // Build update object dynamically to allow multiple fields
        const updateFields = {};
        
        if (req.body.status !== undefined) updateFields.status = req.body.status;
        if (req.body.name !== undefined) updateFields.name = req.body.name;
        if (req.body.email !== undefined) updateFields.email = req.body.email;
        if (req.body.age !== undefined) updateFields.age = req.body.age;
        if (req.body.phone !== undefined) updateFields.phone = req.body.phone;
        if (req.body.paymentMethod !== undefined) updateFields.paymentMethod = req.body.paymentMethod;
        if (req.body.password !== undefined) {
            // Hash the new password if provided
            updateFields.password = await bcrypt.hash(req.body.password, saltRounds);
        }
        
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateFields }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ updated: result.modifiedCount});

    } catch (err) {
        res.status(500).json({ error: 'Invalid User ID or data' });
    }
});

//delete user
app.delete('/users/:id', authenticate, async (req, res) => {
    // Allow users to delete their own account or admins to delete any account
    if (req.user.role !== 'admin' && req.user.userId.toString() !== req.params.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
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

//view rides
app.get('/rides/:id', async (req, res) => {
    try {
        const rides = await db.collection('rides').find().toArray();
        res.status(200).json(rides);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rides' });
    }
});

//request ride
app.post('/rides', authenticate, authorize(['admin', 'user']), async (req, res) => {
    try {
        // Generate random distance (1-100 km) and fare (1-100 currency units)
        const distance = Math.floor(Math.random() * 100) + 1;
        const fare = Math.floor(Math.random() * 100) + 1;
        
        const ride = {
            ...req.body,
            user_id: req.body.user_id ? new ObjectId(req.body.user_id) : req.user.userId,
            distance: distance,
            fare: fare,
            createdAt: new Date()
        }
        const result = await db.collection('rides').insertOne(ride);
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid Ride Data' });
    }
});

//update ride status
app.patch('/rides/:id', async (req, res) => {
    const check = await db.collection('rides').findOne(
        { _id: new ObjectId(req.params.id) }
    );
    if (check.status === 'Completed' || check.status === 'Cancelled') {
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
    } else {
        res.status(400).json({ error: 'Invalid status update' });
    }
});

////////////////////////////Analytics//////////////////////////////////////////

app.get('/analytics/passengers/', authenticate, authorize(['admin']), async (req, res) => {
    try{
    const pipeline = await db.collection('users').aggregate(
            [
                {
                    '$lookup': {
                    'from': 'rides', 
                    'localField': '_id', 
                    'foreignField': 'user_id', 
                    'as': 'user_rides'
                    }
                }, {
                    '$unwind': '$user_rides'
                }, {
                    '$group': {
                    '_id': '$_id', 
                    'name': {
                        '$first': '$name'
                    }, 
                    'totalRides': {
                        '$count': {}
                    }, 
                    'totalFare': {
                        '$sum': '$user_rides.fare'
                    }, 
                    'avgDistance': {
                        '$avg': '$user_rides.distance'
                    }
                    }
                }, {
                    '$project': {
                    '_id': 0
                    }
                }
            ]).toArray();
        res.status(200).json(pipeline);
        }    catch (err) {
        res.status(500).json({ error: 'Error fetching analytics' });
    }});

    app.get('/analytics/drivers/', authenticate, authorize(['admin']), async (req, res) => {
    try{
    const pipeline = await db.collection('drivers').aggregate(
            [
                {
                    '$lookup': {
                    'from': 'rides', 
                    'localField': '_id', 
                    'foreignField': 'driverID', 
                    'as': 'driver_rides'
                    }
                }, {
                    '$unwind': {
                        'path': '$driver_rides',
                        'preserveNullAndEmptyArrays': true
                    }
                }, {
                    '$group': {
                    '_id': '$_id', 
                    'name': {
                        '$first': '$username'
                    },
                    'status': {
                        '$first': '$status'
                    }, 
                    'totalRides': {
                        '$sum': {
                            '$cond': [{ '$ifNull': ['$driver_rides', false] }, 1, 0]
                        }
                    }, 
                    'totalFare': {
                        '$sum': { '$ifNull': ['$driver_rides.fare', 0] }
                    }, 
                    'avgDistance': {
                        '$avg': '$driver_rides.distance'
                    }
                    }
                }, {
                    '$project': {
                    '_id': 0,
                    'name': 1,
                    'status': 1,
                    'totalRides': 1,
                    'totalFare': 1,
                    'avgDistance': 1
                    }
                }
            ]).toArray();
        res.status(200).json(pipeline);
        }    catch (err) {
        res.status(500).json({ error: 'Error fetching analytics' });
    }});