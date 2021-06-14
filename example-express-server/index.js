const express = require('express')
const multer = require('multer')
const cors = require('cors')
const fs = require('fs')

const UPLOAD_PATH = 'uploads/'

if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH)
}

const app = express()

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_PATH)
  },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`)
    }
  })

const upload = multer({ storage })

const port = process.env.PORT || 3000

app.use(cors())

app.post('/image-upload-api', upload.single('image'), (req, res) => {
    console.log(req.file)
    res.json({ success: true, file: req.file })
})

// error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

const server = app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})

function closeGracefully(signal) {
  console.log(`Received signal to terminate: ${signal}`)
 
  server.close(() => {
	  console.log(`HTTP server closed`)
		process.exit()
	})
}

process.on('SIGINT', closeGracefully)
process.on('SIGTERM', closeGracefully)