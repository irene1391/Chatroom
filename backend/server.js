const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const cors = require('cors')

const env = require('./env')
const authHandlers = require('./controllers/auth')
const roomHandlers = require('./controllers/room')
const chatHandlers = require('./controllers/chat')
const { registers: socketControllers } = require('./controllers/socket')
const { registers: socketListeners } = require('./controllers/socketListeners')

const debug = console.error

app.use(express.json())
app.use(cors())

app.use(express.static('frontend'))

app.get('/', (request, response) => {
  response.sendFile('frontend/index.html')
})
// All endpoints are listed here，all requests will send to these endpoints, and they will send  response back 
app.post('/api/signup', (request, response) => authHandlers.signupHandlerAsync({ request, response }).catch(debug))
app.post('/api/login', (request, response) => authHandlers.loginHandlerAsync({ request, response }).catch(debug))
app.post('/api/logout', (request, response) => authHandlers.logoutHandlerAsync({ request, response }).catch(debug))
app.post('/api/create_room', (request, response) => roomHandlers.handleCreateRoomAsync({ request, response }).catch(debug))
app.post('/api/kick', (request, response) => roomHandlers.handleKickAsync({ request, response }).catch(debug))
app.post('/api/ban', (request, response) => roomHandlers.handleBanAsync({ request, response }).catch(debug))
app.post('/api/unban', (request, response) => roomHandlers.handleUnbanAsync({ request, response }).catch(debug))
app.post('/api/room_history', (request, response) => chatHandlers.handleGetHistoryAsync({ request, response }).catch(debug))

socketControllers.registerIOConnection(io)
socketControllers.registerGlobalController()

io.on('connection', socketListeners.registerConnectionController)

http.listen(env.server.port, () => console.log(`Serving at PORT:${env.server.port}`))
