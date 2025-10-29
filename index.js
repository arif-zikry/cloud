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

 console.log(drivers);

 drivers.forEach((element) => console.log(element.name));
 
async function main() {
    const uri = "mongodb://localhost:27017"
    const client =  new MongoClient(uri);
    // const start = Date.now(); // start timer

    try {
        await client.connect();
        // const end = Date.now(); // end timer
        // console.log(`Connection established in ${end - start} ms`);
        console.log("Connected to MongoDB!");

        const db = client.db("testDB");
        // const collection = db.collection("users");
        const driversCollection = db.collection("drivers");

        //W1
        // await collection.insertOne({ name:"Arif", age: 2004 });
        // console.log("Document Inserted!");

        // const result = await collection.findOne({name: "Arif" });
        // console.log("Query result:", result);
        // });

        for (const driver of drivers) {
            const result = await driversCollection.insertOne(driver);
            console.log(`New Driver created with result: ${result}`);
        }

        const availableDrivers = await db.collection('drivers').find({
            isAvailable: true,
            rating: { $gte:4.5 }
        }).toArray();

        console.log("Available Drivers:", availableDrivers);

        const updateResult = await db.collection('drivers').updateMany(
            { name: "Arif Zikry" }, { $inc: { rating: 0.1 } }
        );

        const updatedDriver = await db.collection('drivers').findOne({ name: "Arif Zikry" });
        console.log(`Driver updated with result: ${updateResult}`);

        const deleteResult = await db.collection('drivers').deleteOne({ isAvailable: false });
        console.log(`Deleted driver with result: ${deleteResult}`);
        
    }    catch(err) {
        console.error("Error:", err);
    }   
    
        finally {
        await client.close();
    }
}

main();