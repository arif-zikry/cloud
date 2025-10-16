const { MongoClient } = require('mongodb');

 const drivers = [
    {
        name: "Arif Zikry",
        vehicleType: "Sedan",
        isAvailable: true,
        rating: 4.8,
    },
    {
        name: "Charan Sankara",
        vehicleType: "SUV",
        isAvailable: true,
        rating: 4.5,
    }
 ];

drivers.push({name: "Goh Ming Chen", vehicleType: "Hatchback", isAvailable: false, rating: 4.5});

drivers.forEach((element) => console.log(element));

async function main() {
    const uri = "mongodb://localhost:27017"
    const client =  new MongoClient(uri);
    const start = Date.now(); // start timer

    try {
        await client.connect();
        const end = Date.now(); // end timer
        console.log("Welcome to MongoDB!");
        console.log(`Connection established in ${end - start} ms`);

        const db = client.db("testDB");
        const collection = db.collection("users");
        const driversCollection = db.collection("drivers");

        drivers.forEach(async (driver) => {
            const result = await driversCollection.insertOne(driver);
            console.log(`New Driver created with result: ${result.insertedId}`);
        });

        // await collection.insertOne({ name:"Arif", age: 2004 });
        // console.log("Document Inserted!");

        // const result = await collection.findOne({name: "Arif" });
        // console.log("Query result:", result);
        // })

        const availableDrivers = await db.collection('drivers').find({
            isAvailable: true,
            rating: { $gte:4.5 }
        }).toArray();

        console.log("Available Drivers:", availableDrivers);

        const updateResult = await db.collection('drivers').updateOne(
            { name: "Arif Zikry" },
            { $inc: { rating: 0.1 } }
        );
        console.log(`Updated ${updateResult.modifiedCount} document(s)`);

        const deleteResult = await db.collection('drivers').deleteOne({ isAvailable: false });
        console.log(`Deleted driver with result: ${deleteResult}`);
    }   
    
        catch(err) {
        console.error("Error:", err);
    }   
    
        finally {
        await client.close();
    }
}

main();