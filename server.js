const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mongodb = require('mongodb');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


mongoose.connect(process.env.MDB_URL, (err)=>{
  if(err){
    console.log("Database connection failed.");
  }else{
    console.log(`Database Connected.`);
  }
});

const UserModel = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true}
}));

const ExcerciseModel = mongoose.model('Excercise', new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date,
  userId: String
}));

const LogInfo = mongoose.model('LogInfo', new mongoose.Schema({
  username: String,
  count: Number,
  log: Array
}))



// adding users
app.post('/api/users', (req, res)=>{

  const userFromPost = req.body.username;
  const userToInsert = new UserModel({
    username: userFromPost
  });

  userToInsert.save((err, data)=>{
    if(err){
      console.log("User Insertion failed.");
    }else{
      res.json({username: data.username, _id: data.id});
      }
  });
})


// getting all users
app.get('/api/users', (req, res)=>{
  UserModel.find({}, (err, data)=>{ // return arrayOfData
    if(err){
      console.log("Something weird Happened")
    }else{
      // let newObj = Object.assign({}, ...data);
      // console.log(Object.entries(newObj), typeof(data));
      // res.send(Object.entries(newObj));
      res.send(data);

    }
  })

  
})


app.post('/api/users/:_id/exercises', (req, res)=>{

  
  let formDate = req.body.date;
  let formId = req.params._id;
  
  let newDate;

  if(!formDate || formDate == undefined){
    newDate = new Date();
  }else{
    newDate = new Date(formDate);
  }

  UserModel.findById(formId, (err, userData)=>{
    if(err){
      res.send("Unknown userId");
    }
    else{
      
      let newExercise = new ExcerciseModel({
        description: req.body.description,
        duration: req.body.duration,
        date: newDate,
        userId: formId
      });


      newExercise.save((err, data)=>{
        console.log("Data while saving ",data);
        if(err || !data){
          console.log("Failed.", err);
        }else{
          
          
          res.json({
            _id: formId,
            username: userData.username,
            date: newDate.toDateString(),
            duration: +data.duration,
            description: data.description
          });
        }
      });
    }
  });
});



app.get( '/api/users/:_id/logs', (req, res)=>{

  let { from, to, limit} = req.query;
  let id = req.params._id;
  
  UserModel.findById(id, (err, userData)=>{

    let username = userData.username
    let query = {
      userId: id,
    }

    if(from !== undefined && to === undefined){
      query.date = { $gte : new Date(from)};
    } else if(from === undefined && to !== undefined){
      query.date = { $lte : new Date(to)};
    }else if(from !== undefined && to === undefined){
      query.date = { $gte : new Date(from), $lte : new Date(to)};
    }
    // else if(from === undefined && to === undefined){
    //   query.date;
    // }

    let limitChecker = (limit)=>{
      let maxlimit = 100;
      if(limit){
        return limit;
      }else{
        return maxlimit;
      }
    }

    if(err){
      res.send("not found");
    }else{

      ExcerciseModel.find(query, null, {limit: limitChecker(+limit)}, (err, docs)=>{
        
        if(err){
          console.log("Error", err);
        }else{

          let documents = docs;
          let loggedArray = documents.map((item)=>{
            return {
              description: item.description,
              duration: item.duration,
              date: item.date.toDateString()
            }
          })

          let newLog = new LogInfo({
            username: username,
            count: loggedArray.length,
            log: loggedArray
          })

          newLog.save((err, logdata)=>{
            if(err){
              console.log("Failed Log saving")
            }else{
              res.json({
                _id: id,
                username: logdata.username,
                count: logdata.count,
                log: loggedArray
              })
            }
          })

        }
      })

      // let dateObj = {};


      // if(from){
      //   dateObj["$gte"] = new Date(from);
      // }
      // if(to){
      //   dateObj["$lte"] = new Date(to);
      // }

      // let filter = {userId: id};

      // if(from | to){
      //   filter.date = dateObj;
      // }

      // let noNullLimit = limit ?? 500;
      // ExcerciseModel.find(filter).limit(+limit).exec((err, data)=>{
      //   if(err){
      //     res.json({
      //       _id: id,
      //       username: userData.username,
      //       count: 0,
      //       log: []
      //       });
      //   }else{
      //     const rawLog = data;
      //     const count = data.length;

      //     const userName = userData.username;
      //     const id = userData._id;

      //     const log = rawLog.map((l) => ({
      //       description: l.description,
      //       duration: l.duration,
      //       date: l.date.toDateString()
      //     }))
      //     res.json({
      //       _id: id,
      //       username: userName,
      //       count: +count,
      //       log: log
      //     });
      //   }
      // });
      }
  });
});