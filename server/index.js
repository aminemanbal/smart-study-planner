const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', require('./routes/auth.routes'))

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connecté ✅')
    app.listen(process.env.PORT, () => {
      console.log(`Serveur lancé sur le port ${process.env.PORT} ✅`)
    })
  })
  .catch(err => console.log(err))