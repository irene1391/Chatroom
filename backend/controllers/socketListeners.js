const userService = require('../services/userService')

const store = require('./store')
const roomHandlers = require('./room')
const chatHandlers = require('./chat')

const typeMap = {
  register: 'REGISTER',
  publicChat: 'PUBLIC_CHAT',
  privateChat: 'PRIVATE_CHAT',
  leaveRoom: 'LEAVE_ROOM',
  joinRoom: 'JOIN_ROOM',
  invite: 'INVITATION'
}


const handleRegisterAsync = async ({ payload, socket }) => {
  const { token } = payload
  const { id: socketId } = socket

  const user = await userService.getUserFromTokenAsync(token)

  if (user) store.utils.setUserOnlineStatus(user.id, socketId)
}

// socket listeners of different event
const registerConnectionController = socket => {
  socket.on(typeMap.register, payload => handleRegisterAsync({ payload, socket }))
  socket.on(typeMap.leaveRoom, payload => roomHandlers.handleLeaveRoomAsync({ payload, socket }))
  socket.on(typeMap.joinRoom, payload => roomHandlers.handleJoinRoomAsync({ payload, socket }))
  socket.on(typeMap.invite, payload => roomHandlers.handleInviteAsync({ payload, socket }))
  socket.on(typeMap.publicChat, payload => chatHandlers.handlePublicChatAsync({ payload, socket }))
  socket.on(typeMap.privateChat, payload => chatHandlers.handlePrivateChatAsync({ payload, socket }))
}

module.exports = {
  registers: {
    registerConnectionController
  }
}