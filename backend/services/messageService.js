const db = require('../utils/db')

const createRoomChatAsync = async ({
  roomId,
  content,
  userId
}) => {
  const newMessage = await db.create('message', {
    room_id: roomId,
    content,
    user_id: userId
  })

  return newMessage
}

const getRoomChatAsync = async ({ roomId }) => {
  const result = await db.query('message', {
    room_id: roomId
  })

  return result
}

module.exports = {
  createRoomChatAsync,
  getRoomChatAsync
}