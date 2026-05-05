require('dotenv').config()
const express = require('express')
const cors = require('cors')
const connectDB = require('./config/db')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => res.json({ status: 'Smart Study Planner API running' }))

app.use('/api/auth',     require('./routes/auth.routes'))
app.use('/api/subjects', require('./routes/subject.routes'))
app.use('/api/exams',    require('./routes/exam.routes'))
app.use('/api/tasks',    require('./routes/task.routes'))
app.use('/api/progress', require('./routes/progress.routes'))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: err.message || 'Server error' })
})

const PORT = process.env.PORT || 5000

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} ✅`)
  })
})
