const db = require('../utils/db')
const bcrypt = require('../utils/bcrypt')
const string = require('../utils/string')
const env = require('../env')
const userService = require('../services/userService')
const roomService = require('../services/roomService')
const store = require('./store')
const roomController = require('./room')

// this function get login request, after processing the request it will send response back 
const loginHandlerAsync = async ({ request, response }) => {
  const {
    username,
    password
  } = request.body

  const resp = {
    isSuccessful: false,
    errorMessage: '',
    token: '',
    userId: 0,
    username: ''
  }

  const [user] = await db.query('user', { username })

  if (!user) {
    resp.errorMessage = 'User not found.'
    response.json(resp)

    return
  }

  if (!bcrypt.checkHashed(password, user.password)) {
    resp.errorMessage = 'Username and password does not match.'
    response.json(resp)

    return
  }

  const token = string.getRandomString(env.tokenLen)

  const affectedRows = await db.create('userAttribute', {
    user_id: user.id,
    type: 'token',
    value: token
  })

  if (affectedRows) {
    resp.isSuccessful = true
    resp.token = token
    resp.userId = user.id
    resp.username = user.username
  } else {
    resp.errorMessage = 'Cannot complete login atm.'
  }

  response.json(resp)
}

// this function get logout request, after processing the request it will send response back 
const logoutHandlerAsync = async ({ request, response }) => {
  const {
    token,
    currentRoomId
  } = request.body

  const resp = { isSuccessful: false }

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) {
    response.json(resp)

    return
  }

  const { id: userId } = user

  userService.invalidateTokenAsync(token)
  store.utils.setUserOnlineStatus(userId, null)

  if (!currentRoomId) {
    resp.isSuccessful = true
    response.json(resp)

    return
  }

  const room = await roomService.getRoomAsync(currentRoomId)

  if (!room) {
    response.json(resp)

    return
  }

  store.utils.removeUserFromRoom(userId, room.id)

  if (room.creator_user_id === userId) roomController.disbandRoomAsync({ roomId: room.id })

  resp.isSuccessful = true
  response.json(resp)
}

//this function get signup request, after processing the request it will send response back 
const signupHandlerAsync = async ({ request, response }) => {
  const {
    username,
    password
  } = request.body

  const resp = {
    isSuccessful: false,
    errorMessage: ''
  }

  const [dupeUser] = await db.query('user', { username })

  if (dupeUser) {
    resp.errorMessage = 'Username already exists.'
    response.json(resp)

    return
  }

  const affectedRows = await db.create('user', {
    username: username,
    password: bcrypt.getHashed(password)
  })

  if (affectedRows) {
    resp.isSuccessful = true
  } else {
    resp.errorMessage = 'Cannot complete register atm.'
  }

  response.json(resp)
}

module.exports = {
  loginHandlerAsync,
  logoutHandlerAsync,
  signupHandlerAsync
}
