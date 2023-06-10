const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');

const stripe = require('stripe')('sk_test_51NEW9oAiGt1HR1vDpPvhUZjxmqvuRq1xDrAo33tz6Qg6pz9iYh2pMWHIqJj642L1KuBhskbLkf83Qs000dNtQoPw007b9YYZRD')
const uri = "mongodb+srv://project:bmeGKsPKzpwrqxQt@cluster0.qcnne9d.mongodb.net/?retryWrites=true&w=majority";
const jwtSecret = '79rpYpvwmp4yGmeQ4JkT5hpFDVUntrd0kgl9EdvVQu1b+N1uIlXELOupQknGDvGlWegQGbv9VJ2XbWc4AGgUYoo/nPktkUKimBx5gCzbTvyIuYIEK8U1v49s8uq1ujQ73GU6Yw4DXmECh7qflpn3uPvTgcvNXJwa4gdSKKm/yT7dHZM7mLGXpzUtRBwvePzKxiVTWS3Cg1cezaaNzryIy/GCCzckl6gpOyPBQkopnt7zvZVeRaMniWrWnOrE8gWQlkDTQGGX8UafjjIkietpxxizaUg5vhDE/pUMaP8FEwbAUTcOtcNAoc8l+891iKlX8IRf5eJhyo3Tt5x6mJYBcw=='

app.use(cors())
app.use(express.json())



// -------------  Verify JWT function ---------------------

const verifyJWT = (req,res,next)=>{
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    if(token){
        jwt.verify(token, jwtSecret , (err, decoded) => {
        if (err) {
          return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next()
    })
    }
}

// -----------------------------------------------------


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    client.connect();


    // --------------- Databse Collection's ---------------
    const db = client.db('summer-school').collection('allUsers');
    const dbClasses = client.db('summer-school').collection('Classes');

    // ----------------------------------------------------



    //  -------------------  Create JWT -------------------
    app.post('/jwt', (req,res)=> {
        const token = jwt.sign({data: req.body.email}, jwtSecret , { expiresIn: '1h' })
        res.send({token})
    })
    // ----------------------------------------------------



    
    const verifyAdmin = async (req,res,next) => {
    const email = req?.decoded?.data;
    const query = { email: email }
    const user = await db.findOne(query);
    if (user?.role !== 'admin') {
      return res.status(403).send({ error: true, message: 'forbidden message' });
    }
    next()}


    const verifyInstructor = async(req,res,next) => {
    const email = req?.decoded?.data;
    const query = { email: email }
    const user = await db.findOne(query);
    if (user?.role !== 'instructor') {
      return res.status(403).send({ error: true, message: 'forbidden message' });
    }
    next()}


    const verifyStudent = async(req,res,next) => {
    const email = req?.decoded?.data;
    const query = { email: email }
    const user = await db.findOne(query);
    if(user?.role !== undefined){
      return res.status(403).send({ error: true, message: 'forbidden message' });
    }
    next()}


  

    // ----------- Testing route ----------

    app.get('/' , async(req,res) => {
        const result = await db.find({}).toArray();
        res.send(result)
    })

    

    // ---------------  Admin Routes -------------------

    app.get('/admin/allusers', verifyJWT , verifyAdmin , async(req,res) =>{
        const result = await db.find({}).toArray();
        res.send(result)
    })

    app.get('/admin/allclasses', verifyJWT , verifyAdmin , async(req,res) => {
        const result = await dbClasses.find({}).toArray();
        res.send(result)
    })

    app.patch('/admin/updaterole', verifyJWT , verifyAdmin ,async(req,res) => {
        const update = {
            $set : {
                role: `${req.body.role}`
            }
        }
        const result = await db.updateOne({_id: new ObjectId(req.body.value)},update)
        res.send(result)
    })


    app.post('/admin/classchoose/:data' , verifyJWT , verifyAdmin ,async(req,res) => {
        const update = {
            $set : {
                status : `${req.params.data.split("&")[1]}`,
            }
        }
        if(req.params.data.split("&")[1] == 'denied'){
            update.$set.feedback = req.body.feedback;
        }
        const result = await dbClasses.updateOne({_id: new ObjectId(req.params.data.split("&")[0])},update)
        res.send(result)
    })


    // ----------------- Instructor Routes ---------------------

    app.post('/instructor/addclass', verifyJWT , verifyInstructor ,async(req,res) => {
        if(req.decoded.data == req.body.instructor){
            const result = await dbClasses.insertOne(req.body)
            res.send(result)
        }
    })

    app.get('/instructor/myclasses/:email', verifyJWT , verifyInstructor , async(req,res) => {
        if(req.params.email == req.decoded.data){
            const result = await dbClasses.find({instructor:req.params.email}).toArray()
            res.send(result);
        }
    })

    app.patch('/instructor/updateclass/:id', verifyJWT , verifyInstructor , async(req,res) => {
        const update = {
            $set : req.body.updatedData
        }
        const result = await dbClasses.updateOne({_id : new ObjectId(req.params.id)} , update)
        res.send(result)
    })


    // ------------- Student Routes -------------------

    app.post('/student/select/:data', verifyJWT , verifyStudent , async(req,res) => {       
        const update = {
            $addToSet : {
                selected : req.params.data.split('&')[1]
            }
        }
        const result = await db.updateOne({email:req.params.data.split('&')[0]},update)
        res.send(result)
    })

    
    app.get('/student/selectedclasses/:email', verifyJWT , verifyStudent ,async(req,res) => {
        const find = await db.findOne({email:req.params.email})
        if(find?.selected){
            const ids = find.selected ;
            const objectIds = ids.map(id => new ObjectId(id));
            const query = { _id: { $in: objectIds } };
            const result = await dbClasses.find(query).toArray();
            res.send(result)
        }
    })


    app.post('/student/deleteselected/:data', verifyJWT , verifyStudent ,async(req,res) => {
        const update = {
            $pull : {
                selected : req.params.data.split('&')[0]
            }
        }
        const result = await db.updateOne({email : req.params.data.split('&')[1]},update)
        res.send(result)
    })


    app.get('/student/enrolledclasses/:email', verifyJWT , verifyStudent , async(req,res) => {
        const find = await db.findOne({email : req.params.email});
        if(find?.enrolled){
            const ids = find.enrolled ;
            const objectIds = ids.map(id => new ObjectId(id));
            const query = { _id: { $in: objectIds } };
            const result = await dbClasses.find(query).toArray();
            res.send(result)
        }
    })


    app.post('/create-payment-intent', verifyJWT , verifyStudent , async(req,res) => {
        const { price } = req.body ;
        const paymentIntent = await stripe.paymentIntents.create({
            amount : price*100,
            currency : 'usd' ,
            payment_method_types : ['card' ]
        });
        res.send({
            clientSecret: paymentIntent.client_secret
        })
    })


    app.post('/student/paymentsuccess', verifyJWT , verifyStudent , async(req,res) => {
        const update = {
            $pull : {
                selected : req.body.classId
            },
            $addToSet : {
                enrolled : req.body.classId ,
                paymentHistory : req.body
            }
        }
        const result = await db.updateOne({email : req.body.userEmail},update)
        const updateClass = {
            $inc : {
                availableSeats : -1,
                enrolled : +1
            }
        }
        const resultClass = await dbClasses.updateOne({_id : new ObjectId(req.body.classId)},updateClass)
        res.send(resultClass)

    })


    app.get('/student/paymenthistory/:email', verifyJWT , verifyStudent , async(req,res) => {
        const user = await db.findOne({ email:req.params.email });
        res.send(user.paymentHistory)
    })


   

   
    //--------------  Public Routes ------------------

    app.get('/classes', async(req,res) =>{
        const result = await dbClasses.find({status:'approved'}).toArray();
        res.send(result)
    })

   
    app.get('/instructors', async(req,res) =>{
        const result = await db.find({role:'instructor'}).toArray();
        res.send(result)
    })

 

    //  ------------- After Login -----------------

    app.get('/dashboard/users/check/:email' ,async(req,res) => {
        const result = await db.findOne({email:req.params.email})
        res.send(result)
    })




    // -------------- On register creating new user -----------------

    app.post('/user' ,async(req,res) => {
        const find = await db.findOne({email:req.body.email})
        if(!find){
            const result = await db.insertOne(req.body);
            res.send(result)
        }
    })

    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(process.env.PORT || 8080 , ()=> console.log('listening.....'))