const db = require('../utils/db')

const getRoomAsync = async (roomId, password = '') => {
  let result = null

  result = (await db.query('room', { id: roomId }))[0]

  if (!result) return null

  return result
}

const removeRoomAsync = async roomId => {
  await db.remove('room', { id: roomId })

  return true
}

const createRoomAsync = async ({
  isPrivate,
  roomName,
  password,
  creatorUserId
}) => {
  const newRoom = await db.create('room', {
    is_private: isPrivate ? 1 : 0,
    name: roomName,
    password,
    creator_user_id: creatorUserId
  })

  return newRoom
}

module.exports = {
  getRoomAsync,
  removeRoomAsync,
  createRoomAsync
}