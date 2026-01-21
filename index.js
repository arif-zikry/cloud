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
        const result = await db.collection('users').deleteOne(
            {
                _id : new ObjectId(req.params.id),
                role: 'driver'
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
        const user = {
            ...req.body, 
            password: hashedPassword, 
            role: 'driver',
            status: 'available',
            rating: 0,
            ratingCount: 0
        };
        const result = await db.collection('users').insertOne(user);
        res.status(201).json({ message: "Driver created with id " + result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid Driver Data' });
    }
});

//Get all drivers
app.get('/drivers', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const drivers = await db.collection('users').find({ role: 'driver' }).toArray();
        res.status(200).json(drivers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

//Update driver status
app.patch('/drivers/:id', authenticate, authorize(['admin', 'driver']), async (req, res) => {
    try {
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(req.params.id), role: 'driver' },
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
            { _id: new ObjectId(req.params.id), role: 'driver' }
        );

        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        res.status(200).json(driver);
    } catch (err) {
        res.status(500).json({ error: 'Invalid Driver ID' });
    }
});

// Rate a driver
app.post('/drivers/:id/rate', authenticate, authorize(['user', 'admin']), async (req, res) => {
    try {
        const { rating, comment, rideId } = req.body;
        const driverId = req.params.id;
        
        console.log('Rating request received:', { rating, comment, rideId, driverId, userId: req.user.userId });
        
        // Validate rating (1-5)
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        
        // Verify the ride exists and belongs to the user
        if (rideId) {
            console.log('Checking ride with ID:', rideId);
            let ride;
            try {
                ride = await db.collection('rides').findOne({
                    _id: new ObjectId(rideId)
                });
                console.log('Ride found:', ride);
            } catch (err) {
                console.log('Error finding ride:', err.message);
                return res.status(400).json({ error: 'Invalid ride ID format: ' + rideId });
            }
            
            if (!ride) {
                console.log('Ride not found in database with ID:', rideId);
                return res.status(404).json({ error: 'Ride not found with ID: ' + rideId });
            }
            
            // Check if ride belongs to user
            const rideUserId = ride.user_id ? ride.user_id.toString() : null;
            if (rideUserId !== req.user.userId) {
                return res.status(403).json({ error: 'This ride does not belong to you' });
            }
            
            // Check if ride is completed
            if (ride.status !== 'completed') {
                return res.status(400).json({ error: 'Ride is not completed yet. Current status: ' + ride.status });
            }
            
            // Verify the driver matches the ride
            if (ride.driverID && ride.driverID.toString() !== driverId) {
                return res.status(400).json({ error: 'Driver does not match the ride' });
            }
        }
        
        // Get current driver data
        const driver = await db.collection('users').findOne(
            { _id: new ObjectId(driverId), role: 'driver' }
        );
        
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        
        // Calculate new average rating
        const currentRating = driver.rating || 0;
        const currentCount = driver.ratingCount || 0;
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + parseFloat(rating)) / newCount;
        
        // Update driver with new rating
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(driverId), role: 'driver' },
            { 
                $set: { 
                    rating: newRating,
                    ratingCount: newCount
                },
                $push: {
                    ratingHistory: {
                        userId: new ObjectId(req.user.userId),
                        rating: parseFloat(rating),
                        comment: comment || '',
                        createdAt: new Date()
                    }
                }
            }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(500).json({ error: 'Failed to update rating' });
        }
        
        res.status(200).json({ 
            message: 'Rating submitted successfully',
            newRating: newRating.toFixed(2),
            totalRatings: newCount
        });
    } catch (err) {
        res.status(500).json({ error: 'Error submitting rating: ' + err.message });
    }
});

//Accept/Refuse/complete Ride
app.patch('/rides/:id', authenticate, authorize(['admin', 'driver', 'user']), async (req,res) => {
    try{
        // Build update object from request body
        const updateFields = {};
        if (req.body.status) updateFields.status = req.body.status;
        if (req.body.driverID) updateFields.driverID = new ObjectId(req.body.driverID);
        if (req.body.vehicleID) updateFields.vehicleID = new ObjectId(req.body.vehicleID);
        if (req.body.acceptedAt) updateFields.acceptedAt = req.body.acceptedAt;
        if (req.body.startedAt) updateFields.startedAt = req.body.startedAt;
        if (req.body.completedAt) updateFields.completedAt = req.body.completedAt;
        if (req.body.rated !== undefined) updateFields.rated = req.body.rated;
        
        const result = await db.collection('rides').updateOne(
            { _id : new ObjectId(req.params.id)},
            { $set : updateFields }
        )

        if (result.modifiedCount === 0){
            return res.status(404).json({error: 'Ride not found' });
        }
        
        // Update transaction with driverID when driver is assigned
        if (req.body.driverID) {
            await db.collection('transactions').updateOne(
                { rideID: new ObjectId(req.params.id) },
                { $set: { driverID: new ObjectId(req.body.driverID) } }
            );
        }
        
        // Handle ride status updates
        if (req.body.status) {
            const ride = await db.collection('rides').findOne(
                { _id: new ObjectId(req.params.id) }
            );
            
            const driverId = req.body.driverID || ride.driverID;
            
            if (req.body.status === 'accepted' && driverId) {
                // Keep driver available when accepting a ride
                await db.collection('users').updateOne(
                    { _id: new ObjectId(driverId), role: 'driver' },
                    { $set: { status: 'available' } }
                );
            } else if (req.body.status === 'ongoing' && driverId) {
                // Set driver to busy when ride starts (pickup)
                await db.collection('users').updateOne(
                    { _id: new ObjectId(driverId), role: 'driver' },
                    { $set: { status: 'busy' } }
                );
            } else if (req.body.status === 'completed') {
                // Calculate driver revenue (30% of fare)
                const driverRevenue = ride && ride.fare ? ride.fare * 0.3 : 0;
                
                // Set driver to available and increment revenue when ride completes
                if (driverId) {
                    await db.collection('users').updateOne(
                        { _id: new ObjectId(driverId), role: 'driver' },
                        { 
                            $set: { status: 'available' },
                            $inc: { revenue: driverRevenue }
                        }
                    );
                }
                
                // Update transaction status to 'paid' when ride is completed
                await db.collection('transactions').updateOne(
                    { rideID: new ObjectId(req.params.id) },
                    { 
                        $set: { 
                            status: 'paid',
                            paidAt: new Date()
                        }
                    }
                );
            } else if (req.body.status === 'cancelled' && driverId) {
                // Set driver back to available if ride is cancelled
                await db.collection('users').updateOne(
                    { _id: new ObjectId(driverId), role: 'driver' },
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
        const driverObjectId = new ObjectId(driverID);
        
        // Check if driver already has a vehicle
        const existing = await db.collection('vehicles').findOne({ driverID: driverObjectId });
        
        if (existing) {
            // Update existing vehicle
            const result = await db.collection('vehicles').updateOne(
                { driverID: driverObjectId },
                { $set: { make, model, year, licensePlate, color, capacity, updatedAt: new Date() } }
            );
            res.status(200).json({ message: 'Vehicle updated successfully', _id: existing._id });
        } else {
            // Insert new vehicle
            const vehicle = { driverID: driverObjectId, make, model, year, licensePlate, color, capacity, createdAt: new Date() };
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
        const vehicle = { ...req.body, driver_id: new ObjectId(req.user.userId) };
        const result = await db.collection('vehicles').insertOne(vehicle);
        res.status(201).json({ message: "Vehicle added with id " + result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid Vehicle Data' });
    }
});

app.delete('/drivers/vehicles/:id', authenticate, authorize(['driver']), async (req, res) => {
    try {
        const result = await db.collection('vehicles').deleteOne(
            { _id: new ObjectId(req.params.id), driver_id: new ObjectId(req.user.userId) }
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
            user_id: req.body.user_id ? new ObjectId(req.body.user_id) : new ObjectId(req.user.userId),
            distance: distance,
            fare: fare,
            createdAt: new Date()
        }
        const result = await db.collection('rides').insertOne(ride);
        
        // Create a pending transaction for this ride
        const transaction = {
            rideID: result.insertedId,
            userID: ride.user_id,
            driverID: req.body.driverID ? new ObjectId(req.body.driverID) : null,
            amount: fare,
            status: 'pending',
            createdAt: new Date()
        };
        await db.collection('transactions').insertOne(transaction);
        
        res.status(201).json({ id: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: 'Invalid Ride Data' });
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
    const pipeline = await db.collection('users').aggregate(
            [
                {
                    '$match': { role: 'driver' }
                },
                {
                    '$addFields': {
                        '_idString': { '$toString': '$_id' }
                    }
                },
                {
                    '$lookup': {
                    'from': 'rides', 
                    'let': { 'driverId': '$_id', 'driverIdStr': '$_idString' },
                    'pipeline': [
                        {
                            '$match': {
                                '$expr': {
                                    '$and': [
                                        { '$eq': ['$status', 'completed'] },
                                        {
                                            '$or': [
                                                { '$eq': ['$driverID', '$$driverId'] },
                                                { '$eq': ['$driverID', '$$driverIdStr'] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    'as': 'driver_rides'
                    }
                }, {
                    '$project': {
                    '_id': 0,
                    'name': 1,
                    'status': 1,
                    'rating': { '$ifNull': ['$rating', 0] },
                    'ratingCount': { '$ifNull': ['$ratingCount', 0] },
                    'revenue': { '$ifNull': ['$revenue', 0] },
                    'totalRides': { '$size': '$driver_rides' },
                    'totalFare': { 
                        '$sum': '$driver_rides.fare'
                    },
                    'avgDistance': { 
                        '$cond': [
                            { '$gt': [{ '$size': '$driver_rides' }, 0] },
                            { '$avg': '$driver_rides.distance' },
                            0
                        ]
                    }
                    }
                }
            ]).toArray();
        res.status(200).json(pipeline);
        }    catch (err) {
        res.status(500).json({ error: 'Error fetching analytics' });
    }});