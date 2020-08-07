const debug = console.error

const hostDomain = window.location.origin
const endpoints = {
  signup: `${hostDomain}/api/signup`,
  login: `${hostDomain}/api/login`,
  logout: `${hostDomain}/api/logout`,
  createRoom: `${hostDomain}/api/create_room`,
  kick: `${hostDomain}/api/kick`,
  ban: `${hostDomain}/api/ban`,
  unban: `${hostDomain}/api/unban`,
  history: `${hostDomain}/api/room_history`
}
