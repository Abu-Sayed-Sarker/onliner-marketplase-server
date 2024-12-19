const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()

const port = process.env.PORT || 9000
const app = express()

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.54bcg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {


    const db = client.db('solo-Jobs');
    const jobCollection = db.collection('jobs');
    const bidsCollection = db.collection('bids');





    //post data on clint side 

    app.post('/add-jobs', async (req, res) => {
      const jobData = req.body;


      const result = await jobCollection.insertOne(jobData);

      res.send(result)
    })


    // get all jobs in data base 

    app.get('/all-jobs', async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    })

    // get jobs using user email

    app.get('/all-jobs/:email', async (req, res) => {

      const email = req.params.email;
      const quiery = { 'byear.email': email };
      const result = await jobCollection.find(quiery).toArray();
      res.send(result);
    })


    //dalete a jov using job dainamic id

    app.delete('/job/:id', async (req, res) => {
      const id = req.params.id;
      const quiery = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(quiery);
      res.send(result);
    })


    //post bids data in client side

    app.post('/add-bid', async (req, res) => {
      const bidData = req.body;


      //if a user placed abids alrady in this job

      const query = { email: bidData.email, jobId: bidData.jobId };

      const alreadyexist = await bidsCollection.findOne(query)
      if (alreadyexist) {
        return res.status(400).send("You have already bid this job.")
      }


      //save data in data bse
      const result = await bidsCollection.insertOne(bidData);



      // increase bids count in jobs collaction

      const filtter = { _id: new ObjectId(bidData.jobId) }

      const update = {
        $inc: { bit_count: 1 },
      }
      const updateBidsCount = await jobCollection.updateOne(filtter, update);

      console.log(updateBidsCount);

      res.send(result)
    })




    // get spaciphic bids data using user email

    app.get('/bids/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email }
      const result = await bidsCollection.find(query).toArray();
      res.send(result)
    })

    // get spaciphic  bids requast data using user email

    app.get('/bids-requst/:email', async (req, res) => {
      const email = req.params.email;
      const query = { byear: email }
      const result = await bidsCollection.find(query).toArray();
      res.send(result)
    })


    //update bid status

    app.patch('/bid-status-update/:id', async (req, res) => {
      const status = req.body;
      const id = req.params.id;
      const filtter = { _id: new ObjectId(id) }
      const update = {
        $set: { status },
      }
      const result = await bidsCollection.updateOne(filtter, update);
      res.send(result);

    })

    // get one job data using id for update and application section

    //finde update job

    app.get('/job/:id', async (req, res) => {
      const id = req.params.id;
      const quiery = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(quiery);
      res.send(result)
    })

    //update job

    app.put('/update/:id', async (req, res) => {
      const id = req.params.id;

      const jobData = req.body;


      const quiery = { _id: new ObjectId(id) };

      const option = { upsert: true };
      const update = {
        $set: jobData,
      };

      const result = await jobCollection.updateOne(quiery, update, option);
      res.send(result);


    })



    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
