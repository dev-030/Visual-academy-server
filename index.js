const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');

const stripe = require('stripe')('sk_test_51NEW9oAiGt1HR1vDpPvhUZjxmqvuRq1xDrAo33tz6Qg6pz9iYh2pMWHIqJj642L1KuBhskbLkf83Qs000dNtQoPw007b9YYZRD')


app.use(cors())
app.use(express.json())


const verifyJWT = (req,res,next)=>{

}


app.post('/jwt', (req,res)=> {
    const token = jwt.sign({data: req.body.email}, 'secret', { expiresIn: '1h' })
    res.send({token})
})

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://project:bmeGKsPKzpwrqxQt@cluster0.qcnne9d.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

    const db = client.db('summer-school').collection('collection0');
    const dbClasses = client.db('summer-school').collection('Classes');


    

    app.get('/' , async(req,res) => {
        const result = await db.find({}).toArray();
        res.send(result)
    })

    app.post('/student/select/:data' , async(req,res) => {       
        const update = {
            $addToSet : {
                selected : req.params.data.split('&')[1]
            }
        }
        const result = await db.updateOne({email:req.params.data.split('&')[0]},update)
        res.send(result)
    })


    app.post('/create-payment-intent' , async(req,res) => {
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




    app.get('/allusers', async(req,res) =>{
        const result = await db.find({}).toArray();
        res.send(result)
    })

    app.get('/classes', async(req,res) =>{
        const result = await dbClasses.find({status:'approved'}).toArray();
        res.send(result)
       
    })

    app.get('/admin/allclasses' , async(req,res) => {
        const result = await dbClasses.find({}).toArray();
        res.send(result)
    })

    app.get('/instructors', async(req,res) =>{
        const result = await db.find({role:'instructor'}).toArray();
        res.send(result)
    })

    app.patch('/admin/makeinstructor/:id' , async(req,res) => {

        const update = {
            $set : {
                role:'instructor'
            }
        }
        const result = await db.updateOne({_id: new ObjectId(req.params.id)},update)
        res.send(result)
    
    })




    app.post('/admin/classchoose/:data' , async(req,res) => {

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



    app.get('/users/check/:email' , async(req,res) => {

        const result = await db.findOne({email:req.params.email})
        res.send(result)
        
    })

    app.get('/student/selectedclasses/:email',async(req,res) => {


        const find = await db.findOne({email:req.params.email})

        if(find.selected){
            const ids = find.selected ;
            const objectIds = ids.map(id => new ObjectId(id));
            const query = { _id: { $in: objectIds } };
            const result = await dbClasses.find(query).toArray();
            res.send(result)
        }

      
        

    })


    // ---------------- Currently Working -----------
2
    app.post('/student/deleteselected/:data', async(req,res) => {
        const update = {
            $pull : {
                selected : req.params.data.split('&')[0]
            }
        }

        const result = await db.updateOne({email : req.params.data.split('&')[1]},update)
        res.send(result)
    })


    app.post('/student/paymentsuccess' , async(req,res) => {

        const update = {
            $pull : {
                selected : req.body.classId
            },
            $push : {
                enrolled : req.body.classId ,
                paymentHistory : req.body
            }
        }
        const result = await db.updateOne({email : req.body.userEmail},update)
        const updateClass = {
            $inc : {
                availableSeats : -1
            }
        }
        const resultClass = await dbClasses.updateOne({_id : new ObjectId(req.body.classId)},updateClass)
        res.send(resultClass)

    })


    app.post('/user' , async(req,res) => {
        const result = await db.insertOne(req.body);
        res.send(result)
    })

    app.post('/instructor/addclass', async(req,res) => {
        const result = await dbClasses.insertOne(req.body)
        res.send(result)
    })

    app.get('/instructor/myclasses/:email' , async(req,res) => {
        const result = await dbClasses.find({instructor:req.params.email}).toArray()
        res.send(result);
    })


    // -------------To DO--------------
    app.patch('/instructor/updateclass' , async(req,res) => {
        // console.log(req.body)
    })






    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(process.env.PORT || 8080 , ()=> console.log('listening.....'))