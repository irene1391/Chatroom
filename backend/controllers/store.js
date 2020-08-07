
// this file implements the function of cache
// we store the information of online user
// we store the information of which user in the room
const db = require('../utils/db')
const sha256 = require('crypto-js/sha256')

let userList = []
let roomList = []

const getRoomList = () => roomList
const getUserList = () => userList

const getNewUserObject = user => ({
  id: user.id,
  username: user.username,
  socketId: null
})

const getNewRoomObject = room => ({
  id: room.id,
  userIds: [],
  bannedUserIds: [],
  name: room.name,
  isPrivate: !!room.is_private,
  creatorUserId: parseInt(room.creator_user_id),
  password: room.password ? sha256(room.password).toString() : null
})

const refreshUserListAsync = async () => {
  const allUsers = await db.query('user')

  userList = allUsers
    .map(getNewUserObject)
    .map(user => Object.assign({}, user, userList.find(u => u.id === user.id)))
}

const refreshRoomListAsync = async () => {
  const allRoom = await db.query('room')
  const allRoomAtt = await db.query('roomAttribute', { type: 'banned_user_id' })
  const allRoomBannedUserList = []

  allRoomAtt.map(roomAtt => {
    const index = allRoomBannedUserList.findIndex(r => r.id === roomAtt.room_id)

    if (index >= 0) allRoomBannedUserList[index].userList.push(parseInt(roomAtt.value))
    else allRoomBannedUserList.push({ id: roomAtt.room_id, userList: [parseInt(roomAtt.value)] })
  })

  roomList = allRoom
    .map(getNewRoomObject)
    .map(room => Object.assign({}, room, roomList.find(r => r.id === room.id)))
    .map(room => Object.assign({}, room, { bannedUserIds: (allRoomBannedUserList.find(r => r.id === room.id) || {}).userList || [] }))
}



const setUserOnlineStatus = (userId, socketId, isDiscardable = false) => {
  const index = userList.findIndex(u => u.id === userId)

  if (index < 0 && !isDiscardable) refreshUserListAsync().then(() => setUserOnlineStatus(userId, socketId, true)).catch(console.error)
  else if (index >= 0) userList[index].socketId = socketId
}

const addUserToRoom = (userId, roomId, isDiscardable = false) => {
  const index = roomList.findIndex(r => r.id === roomId)

  if (index < 0 && !isDiscardable) refreshRoomListAsync().then(() => addUserToRoom(userId, roomId, true)).catch(console.error)
  else if (index >= 0 && !roomList[index].userIds.includes(userId)) roomList[index].userIds.push(userId)
}

const removeUserFromRoom = (userId, roomId, isDiscardable = false) => {
  const index = roomList.findIndex(r => r.id === roomId)

  if (index < 0 && !isDiscardable) refreshRoomListAsync().then(() => removeUserFromRoom(userId, roomId, true)).catch(console.error)
  else if (index >= 0) roomList[index].userIds = roomList[index].userIds.filter(u => u !== userId)
}

const banUserFromRoom = async (userId, roomId) => {
  const [roomAtt] = await db.query('roomAttribute', { type: 'banned_user_id', room_id: roomId, value: userId })

  if (!roomAtt) await db.create('roomAttribute', { type: 'banned_user_id', room_id: roomId, value: userId })
  refreshRoomListAsync()
}

const unbanUserFromRoom = async (userId, roomId) => {
  await db.remove('roomAttribute', { type: 'banned_user_id', room_id: roomId, value: userId })
  refreshRoomListAsync()
}

const getUserIdsFromRoom = roomId => {
  return (roomList.find(room => room.id === roomId) || {}).userIds || []
}

const getBannedUserIdsFromRoom = roomId => {
  return (roomList.find(room => room.id === roomId) || {}).bannedUserIds || []
}

const getUserSocketIdFromUserId = userId => {
  return (userList.find(user => user.id === userId) || {}).socketId || null
}

const isUserInRoom = (userId, roomId) => {
  return !!getUserIdsFromRoom(roomId).find(u => u === userId)
}

const isUserBannedFromRoom = (userId, roomId) => {
  return !!getBannedUserIdsFromRoom(roomId).find(u => u === userId)
}

module.exports = {
  getRoomList,
  getUserList,
  userList,
  roomList,
  utils: {
    refreshUserListAsync,
    refreshRoomListAsync,
    setUserOnlineStatus,
    addUserToRoom,
    removeUserFromRoom,
    banUserFromRoom,
    unbanUserFromRoom,
    getUserIdsFromRoom,
    getUserSocketIdFromUserId,
    isUserInRoom,
    isUserBannedFromRoom
  }
}