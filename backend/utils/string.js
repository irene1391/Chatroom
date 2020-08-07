// Sourced from https://stackoverflow.com/a/1349426
const getRandomString = len => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  for (let i = 0; i < len; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return result
}

module.exports = {
  getRandomString
}