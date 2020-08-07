const db = require('../utils/db')

const getUserFromUserIdAsync = async userId => {
  const [user] = await db.query('user', { id: userId })

  return user || null
}

const getUserFromTokenAsync = async token => {
  const [result] = await db.query('userAttribute', { type: 'token', value: token })

  if (!result) return null

  const { user_id: userId } = result
  const [user] = await db.query('user', { id: userId })

  return user || null
}

const invalidateTokenAsync = async token => {
  await db.remove('userAttribute', { type: 'token', value: token })

  return true
}

module.exports = {
  getUserFromUserIdAsync,
  getUserFromTokenAsync,
  invalidateTokenAsync
}