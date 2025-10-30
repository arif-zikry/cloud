# Week 1

*Installation Steps*

1. Install all prerequisite software: node.js, Visual Studio Code, MongoDB Server and Compass, Git.
2. Create new repo folder in developer computer and intialize git.
3. Create new repo in GitHub.
4. Write Readme.md in repo folder and commit + push with status.
5. install MongoDB in js using npm
6. Run index.js to test MongoServer

# Week 2

*JSON Questions*

1. Explain what is CRUD operations and how it is relates to the mongo functions in the exercise.

<span style="color:blue">CRUD or Create, Read, Update and Delete are the basic operations in managing a dataset. In this exercise all these basic functions were used to manipulate data inside the Mongo Database.</span>

2. Identify all the mongo operators used in the exercise, then explain the usage for each.

<span style="color:blue">InsertOne: Inserts a new document inside a collection, FindOne: Finds a document matching the specified filters, UpdateOne: Updates the elements of a document, DeleteOne: Deletes a document from the collection, gte: Greater or equal to.</span>

3. Replace the mongo functions in Task 5 to updateMany instead of updateOne, compare the difference based on the result in console and the mongo compass.

<span style="color:blue">No change as it only changes the document with the same specfied value of element. Will make a difference if specified to documents that share the same value for an element.</span>

4. Replace the mongo functions in Task 6 to deleteMany instead of deleteOne, compare the difference based on the result in console and the mongo compass. 

<span style="color:blue">In my case, the same as question 3 since I only have one driver as unavailable but after changing another driver to unavailable only one of the documents are deleted when using deleteOne compared to all of the unavailable being deleted when using deleteMany.</span>

# Week 3

1. POST Request:

- what HTTP status code is returned when a ride is created successfully?

the server returns a code 201 when a ride is created successfully

- What is the structure of the response body?

the response is structured in JSON

2. GET Request

- What happens if the rides in the collection are empty?

The returned body is empty with a result of "[]"

- What data type is returned in response?

Array

3. Fix PATCH and DELETE error

Catch the error when requesting PATCH or DELETE API, then try to fix the issue reported.

When requesting PATCH or DELETE, the system catches an internal server error(500): Invalid ride ID. This issue is resolved by including the ObjectID library into the server.

If you tried to update a non-existent ride ID, what status code is returned?

server returns an error(500) Invalid park ID or data.

What is the value of updated in the response if the update succeeds?

the value is 1, since only 1 document is updated

How does the API differentiate between a successful deletion and a failed one?

a successful deletion would return a deleted {1} while a failed deletion would return an error 404: ride not found

4. User endpoints

Based on the exercise above, create the endpoints to handle the CRUD operations for users account.

Pending..

5. FrontEnd

Upload the postman JSON to any AI tools, and generate a simple HTML and JS dashboard for you.

Refer to image in Week 3

