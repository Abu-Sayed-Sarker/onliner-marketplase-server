const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require("jsonwebtoken")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()

const port = process.env.PORT || 9000
const app = express()


const corsOption = {
  origin: ["http://localhost:5173"],
  credentials: true,
  optionalSuccessStatus: 200,
}

app.use(cors(corsOption))
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.54bcg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

// verify jhwt  token midelwear

const verifyToken = (req, res, next) => {

  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'unauthorized access' })
  jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
    if (err) {
      return res.status(403).send({ message: 'unauthorized access' })
    }
    req.user = decode
  })




  next()
}
async function run() {
  try {


    const db = client.db('solo-Jobs');
    const jobCollection = db.collection('jobs');
    const bidsCollection = db.collection('bids');



    // jsonweb tokwn genarate

    app.post('/jwt', async (req, res) => {
      const email = req.body;

      //create token
      const token = jwt.sign(email, process.env.SECRET_KEY, { expiresIn: '1d' })

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
        .send({ success: true })

    })
    // log out and delete cookie

    app.get('/logout', async (req, res) => {
      res.clearCookie('token', {
        maxAge: 0,
        credentials: true,
        optionalSuccessStatus: 200,
      })
        .send({ success: true })
    })






    //post data on clint side 

    app.post('/add-jobs', async (req, res) => {
      const jobData = req.body;


      const result = await jobCollection.insertOne(jobData);

      res.send(result)
    })


    // get all jobs in data base and filter, sorting, and serching function

    app.get('/all-jobs', async (req, res) => {
      const filter = req.query.filter;
      // const search = req.query.search;
      const sort = req.query.sort;

      // sort vai date 
      let options = {}
      if (sort) options = { sort: { date: sort === 'asc' ? 1 : -1 } }


      let query = {
        // job_title: { $regex: search, $options: 'i' }
      };
      if (filter) query.category = filter;
      const result = await jobCollection.find(query, options).toArray();
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

    app.get('/bids-requst/:email', verifyToken, async (req, res) => {
      const decodedEmail = req.user?.email
      const email = req.params.email;
      if (decodedEmail !== email) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const query = { byear: email }
      const result = await bidsCollection.find(query).toArray();
      res.send(result)
    })


    //update bid status

    app.patch('/bid-status-update/:id', async (req, res) => {
      const { status } = req.body;
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
