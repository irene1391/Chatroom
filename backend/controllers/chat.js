const userService = require('../services/userService')
const store = require('./store')
const socket = require('./socket')
const roomService = require('../services/roomService')
const messageService = require('../services/messageService')

// This function used to send SSA
const handlePublicChatAsync = async ({ payload }) => {
  const {
    roomId,
    content,
    token
  } = payload

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) return
  const { id: userId } = user
  const room = await roomService.getRoomAsync(roomId)

  if (!room) return
  if (!store.utils.isUserInRoom(userId, roomId)) return

  messageService.createRoomChatAsync({
    roomId,
    content,
    userId
  })

  // We dont care if saved, just sent SSAs anyway
  store.utils.getUserIdsFromRoom(roomId).map(inRoomUserId => {
    const socketId = store.utils.getUserSocketIdFromUserId(inRoomUserId)

    if (socketId) socket.emitters.sendRoomChatSSA({ socketId, roomId, userId, content })
  })
}
// this function used to send PSA
const handlePrivateChatAsync = async ({ payload }) => {
  const {
    targetUserId,
    content,
    token
  } = payload

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) return

  const { id: userId } = user
  const socketId = store.utils.getUserSocketIdFromUserId(targetUserId)

  if (!socketId) return

  socket.emitters.sendPMSSA({ socketId, fromUserId: userId, content })
}
// this function used to get the message history of a room 
const handleGetHistoryAsync = async ({ request, response }) => {
  const {
    token,
    roomId
  } = request.body

  const resp = { chat: [] }

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) {
    response.json(resp)

    return
  }

  const room = roomService.getRoomAsync(roomId)

  if (!room) {
    response.json(resp)

    return
  }

  messageService.getRoomChatAsync({ roomId }).then(result => {
    resp.chat = result

    response.json(resp)
  })
}

module.exports = {
  handlePublicChatAsync,
  handlePrivateChatAsync,
  handleGetHistoryAsync
}
