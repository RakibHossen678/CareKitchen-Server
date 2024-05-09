const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('CareKitchen sever is running')
})

app.listen(port, () => {
  console.log(`CareKitchen sever is listening on port ${port}`)
})