const userService = require('../services/userService')
const store = require('./store')
const socket = require('./socket')
const roomService = require('../services/roomService')

// this funciton used to when the creator leaving the chat room 
const disbandRoomAsync = async ({ roomId }) => {
  const allUserIdsInRoom = store.utils.getUserIdsFromRoom(roomId)

  allUserIdsInRoom
    .map(inRoomUserId => ({
      socketId: store.utils.getUserSocketIdFromUserId(inRoomUserId),
      userId: inRoomUserId
    }))
    .map(inRoomUser => {
      socket.emitters.sendKickSSA({
        socketId: inRoomUser.socketId,
        roomId,
        userId: inRoomUser.userId
      })
      store.utils.removeUserFromRoom(inRoomUser.userId, roomId)
    })

  await roomService.removeRoomAsync(roomId).then(store.utils.refreshRoomListAsync)
}

// this function used when user leave a chat room
const handleLeaveRoomAsync = async ({ payload }) => {
  const {
    currentRoomId,
    token
  } = payload

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) return
  if (!currentRoomId) return

  store.utils.removeUserFromRoom(user.id, currentRoomId)

  const room = await roomService.getRoomAsync(currentRoomId)

  if (!room) return
  if (room.creator_user_id === user.id) disbandRoomAsync({ roomId: currentRoomId })
}

// this function used when user join a chat room
const handleJoinRoomAsync = async ({ payload }) => {
  const {
    targetRoomId,
    token
  } = payload

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) return

  store.utils.addUserToRoom(user.id, targetRoomId)
}

// this function used when creating a chat room 
const handleCreateRoomAsync = async ({ request, response }) => {
  const {
    token,
    isPrivate,
    roomName,
    password
  } = request.body

  const resp = {
    isSuccessful: false,
    roomId: 0,
    roomName: '',
    password: '',
    isPrivate: false
  }

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) {
    response.json(resp)

    return
  }

  roomService.createRoomAsync({
    isPrivate,
    roomName,
    password,
    creatorUserId: user.id
  }).then(newRoom => {
    resp.isSuccessful = true
    resp.roomId = newRoom.id
    resp.roomName = newRoom.name
    resp.password = newRoom.password
    resp.isPrivate = newRoom.is_private

    response.json(resp)
  }).catch(e => {
    console.error(e)

    response.json(resp)
  })
}
// this function used when kicking user from chat room 
const handleKickAsync = async ({ request, response }) => {
  const {
    token,
    roomId,
    targetUserId
  } = request.body

  const resp = { isSuccessful: false }

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) {
    response.json(resp)

    return
  }

  const room = await roomService.getRoomAsync(roomId)

  if (!room || room.creator_user_id !== user.id) {
    response.json(resp)

    return
  }

  const targetUser = await userService.getUserFromUserIdAsync(targetUserId)

  if (!targetUser || targetUser.id === user.id) {
    response.json(resp)

    return
  }

  const socketId = store.utils.getUserSocketIdFromUserId(targetUser.id)

  if (!socketId) {
    response.json(resp)

    return
  }

  store.utils.removeUserFromRoom(targetUser.id, roomId)
  socket.emitters.sendKickSSA({ socketId, roomId, userId: targetUser.id })

  resp.isSuccessful = true
  response.json(resp)
}
// this function used when banning user 
const handleBanAsync = async ({ request, response }) => {
  const {
    token,
    roomId,
    targetUserId
  } = request.body

  const resp = { isSuccessful: false }

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) {
    response.json(resp)

    return
  }

  const room = await roomService.getRoomAsync(roomId)

  if (!room || room.creator_user_id !== user.id) {
    response.json(resp)

    return
  }

  const targetUser = await userService.getUserFromUserIdAsync(targetUserId)

  if (!targetUser || targetUser.id === user.id) {
    response.json(resp)

    return
  }

  const socketId = store.utils.getUserSocketIdFromUserId(targetUser.id)

  if (!socketId) {
    response.json(resp)

    return
  }

  store.utils.removeUserFromRoom(targetUser.id, roomId)
  store.utils.banUserFromRoom(targetUser.id, roomId)
  socket.emitters.sendbanSSA({ socketId, roomId, userId: targetUser.id })

  resp.isSuccessful = true
  response.json(resp)
}
// this function used when unbanning user 
const handleUnbanAsync = async ({ request, response }) => {
  const {
    token,
    roomId,
    targetUserId
  } = request.body

  const resp = { isSuccessful: false }

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) {
    response.json(resp)

    return
  }

  const room = await roomService.getRoomAsync(roomId)

  if (!room || room.creator_user_id !== user.id) {
    response.json(resp)

    return
  }

  store.utils.unbanUserFromRoom(targetUserId, roomId)
    .then(() => {
      resp.isSuccessful = true

      response.json(resp)
    })
    .catch(e => {
      console.error(e)
      response.json(resp)
    })
}
// this function used when inviting user to room 
const handleInviteAsync = async ({ payload }) => {
  const {
    token,
    targetUserId,
    roomId,
    password
  } = payload

  const user = await userService.getUserFromTokenAsync(token)

  if (!user) return

  const room = await roomService.getRoomAsync(roomId)

  if (!room) return

  if (store.utils.isUserInRoom(targetUserId, roomId)) return

  const targetUser = await userService.getUserFromUserIdAsync(targetUserId)

  if (!targetUser || store.utils.isUserBannedFromRoom(targetUserId, roomId)) return

  const socketId = store.utils.getUserSocketIdFromUserId(targetUserId)

  if (!socket) return

  socket.emitters.sendInviteSSA({
    socketId,
    roomId: room.id,
    roomName: room.name,
    password,
    fromUserId: user.id
  })
}

module.exports = {
  disbandRoomAsync,
  handleLeaveRoomAsync,
  handleJoinRoomAsync,
  handleCreateRoomAsync,
  handleKickAsync,
  handleBanAsync,
  handleUnbanAsync,
  handleInviteAsync
}
