app.controller('mainController', [
  '$scope',
  '$rootScope',
  '$location',
  '$routeParams',
  'publicSocket',
  '$window',
  '$http',
  function ($scope, $rootScope, $location, $routeParams, publicSocket, $window, $http) {
    /**
     * Roots auth
     */
    $rootScope.token = $rootScope.token || ''
    $rootScope.username = $rootScope.username || ''
    $rootScope.userId = $rootScope.userId || 0

    /**
     * Roots state
     */
    $rootScope.userList = $rootScope.userList || []
    $rootScope.roomList = $rootScope.roomList || []

    /**
     * Roots chat
     */
    $rootScope.chatRoomId = $rootScope.chatRoomId || 0
    $rootScope.chatRoomName = $rootScope.chatRoomName || ''
    $rootScope.chatRoomPassword = $rootScope.chatRoomPassword || null

    /**
     * Scope lists
     */
    $scope.publicRoomList = $scope.publicRoomList || []
    $scope.privateRoomList = $scope.privateRoomList || []

    $scope.outsideUserList = $scope.outsideUserList || []
    $scope.inroomUserList = $scope.inroomUserList || []

    /**
     * Scope inputs
     */
    $scope.publicRoomListCreateRoomNameInput = ''
    $scope.privateRoomListCreateRoomNameInput = ''
    $scope.privateRoomListCreateRoomPasswordInput = ''
    $scope.privateRoomListJoinPasswordInput = ''
    $scope.privateMessageUserIdInput = 0
    $scope.privateMessageContentInput = ''
    $scope.chatMessageInput = ''
    $scope.chatMessageSearchInput = ''

    /**
     * Scope Bools
     */
    $scope.isShowingPM = $scope.isShowingPM || false
    $scope.isShowingAM = $scope.isShowingAM || false
    $scope.isCreatorOfRoom = ($rootScope.roomList.find(r => r.id === $rootScope.chatRoomId) || { creatorUserId: 0 }).creatorUserId === $rootScope.userId

    /**
     * Scope messages
     */
    $scope.privateMessages = $scope.privateMessages || []
    $scope.adminMessages = $scope.adminMessages || []
    $scope.chatMessages = $scope.chatMessages || []

    $scope.isSelf = function (userId) {
      return userId === $rootScope.userId
    }

    //below is the definition of angular scopes
    //and following are the funtion

    const socketEmitEventMap = {
      publicChat: 'PUBLIC_CHAT',
      privateChat: 'PRIVATE_CHAT',
      leaveRoom: 'LEAVE_ROOM',
      joinRoom: 'JOIN_ROOM',
      invite: 'INVITATION'
    }

    const loadMessageHistory = function (roomId) {
      postToEndpoint({
        url: endpoints.history,
        payload: {
          token: $rootScope.token,
          roomId
        },
        callback: function (response) {
          if (response.chat) {
            const chats = response.chat.map(chat => {
              return {
                roomId: chat.room_id,
                content: chat.content,
                userId: chat.user_id,
                user: {
                  id: chat.user_id,
                  username: ($rootScope.userList.find(u => u.id === chat.user_id) || { username: 'Someone' }).username
                }
              }
            })

            $scope.chatMessages = chats.slice()
          }
        }
      })
    }

    const postToEndpoint = function ({ url, payload, callback }) {
      $http({
        url,
        method: 'POST',
        data: JSON.stringify(payload),
        headers: {'Content-Type': 'application/json'}
      }).success(callback)
    }

    const getPublicRoomList = roomList => {
      return roomList.filter(room => !room.isPrivate).map(room => {
        return Object.assign({}, room, {
          banned: room.bannedUserIds.includes($rootScope.userId)
        })
      })
    }

    const getPrivateRoomList = roomList => {
      return roomList.filter(room => room.isPrivate).map(room => {
        return Object.assign({}, room, {
          banned: room.bannedUserIds.includes($rootScope.userId)
        })
      })
    }

    const handleLeaveRoom = function (isRedirecting = true) {
      const payload = {
        currentRoomId: $rootScope.chatRoomId,
        token: $rootScope.token
      }

      publicSocket.emit(socketEmitEventMap.leaveRoom, payload)
      $rootScope.chatRoomId = 0
      $rootScope.chatRoomName = ''
      $rootScope.chatRoomPassword = ''
      $scope.isCreatorOfRoom = false

      if (isRedirecting) {
        $location.path('/')
      }
    }

    const handleJoinRoom = function (roomId, isPrivate, password = null) {
      const targetRoom = $rootScope.roomList.find(room => room.id === roomId)

      if (!targetRoom) {
        debug(`No room ${roomId} found`)

        return
      }

      const isBanned = targetRoom.bannedUserIds.includes($rootScope.userId)

      if (isBanned) {
        debug(`User ${$rootScope.userId} was banned from romm ${roomId}`)

        return
      }

      if (targetRoom.isPrivate) {
        if (!password) {
          debug('Password not provided for the private room')

          return
        }

        if (targetRoom.password && targetRoom.password !== CryptoJS.SHA256(password).toString()) {
          debug('Password incorrect for the private room')

          return
        }
      }

      const payload = {
        targetRoomId: roomId,
        token: $rootScope.token
      }

      publicSocket.emit(socketEmitEventMap.joinRoom, payload)

      $rootScope.chatRoomId = roomId
      $rootScope.chatRoomName = targetRoom.name
      $rootScope.chatRoomPassword = isPrivate ? password: null
      $location.path(`/room/${roomId}`)
    }

    const handleCreateRoom = function (isPrivate, roomName, password = null) {
      postToEndpoint({
        url: endpoints.createRoom,
        payload: {
          token: $rootScope.token,
          isPrivate,
          roomName,
          password
        },
        callback: function (response) {
          const {
            isSuccessful,
            roomId,
            roomName,
            password,
            isPrivate
          } = response

          if (isSuccessful) {
            if ($rootScope.chatRoomId) handleLeaveRoom(false)

            $rootScope.chatRoomName = roomName
            $rootScope.chatRoomPassword = password
            setTimeout(function () {
              handleJoinRoom(roomId, isPrivate, password)
            }, 3000)
          }
        }
      })
    }

    const kickUser = function (targetUserId) {
      const currentRoom = $rootScope.roomList.find(room => room.id === $rootScope.chatRoomId)

      if (!currentRoom || currentRoom.creatorUserId !== $rootScope.userId) {
        debug(`Current room creatorUserId ${currentRoom.creatorUserId} does not equals userId ${$rootScope.userId}`)

        return
      }

      postToEndpoint({
        url: endpoints.kick,
        payload: {
          token: $rootScope.token,
          roomId: $rootScope.chatRoomId,
          targetUserId
        },
        callback: function () {}
      })
    }

    const banUser = function (targetUserId) {
      const currentRoom = $rootScope.roomList.find(room => room.id === $rootScope.chatRoomId)
      if (!currentRoom || currentRoom.creatorUserId !== $rootScope.userId) {
        debug(`Current room creatorUserId ${currentRoom.creatorUserId} does not equals userId ${$rootScope.userId}`)

        return
      }

      postToEndpoint({
        url: endpoints.ban,
        payload: {
          token: $rootScope.token,
          roomId: $rootScope.chatRoomId,
          targetUserId
        },
        callback: function () {}
      })
    }

    const unbanUser = function (targetUserId) {
      const currentRoom = $rootScope.roomList.find(room => room.id === $rootScope.chatRoomId)
      if (!currentRoom || currentRoom.creatorUserId !== $rootScope.userId) {
        debug(`Current room creatorUserId ${currentRoom.creatorUserId} does not equals userId ${$rootScope.userId}`)

        return
      }

      postToEndpoint({
        url: endpoints.unban,
        payload: {
          token: $rootScope.token,
          roomId: $rootScope.chatRoomId,
          targetUserId
        },
        callback: function () {}
      })
    }

    const sendChatRoomMessage = function (content) {
      const payload = {
        token: $rootScope.token,
        roomId: $rootScope.chatRoomId,
        content
      }

      publicSocket.emit(socketEmitEventMap.publicChat, payload)
    }

    const sendPrivateMessage = function (content, targetUserId) {
      const payload = {
        token: $rootScope.token,
        targetUserId,
        content
      }

      publicSocket.emit(socketEmitEventMap.privateChat, payload)
    }

    const sendInvitation = function (targetUserId) {
      const payload = {
        token: $rootScope.token,
        targetUserId,
        roomId: $rootScope.chatRoomId,
        password: $rootScope.chatRoomPassword
      }

      publicSocket.emit(socketEmitEventMap.invite, payload)
    }

    const handleKick = function (payload) {
      const {
        roomId,
        userId
      } = payload

      if ($rootScope.chatRoomId === roomId) {
        debug(`Kicked: roomId:${roomId} userId:${userId}`)

        $scope.adminMessages.push({ content: `You were removed from roomId ${roomId} by userId ${userId}` })
        $scope.isShowingAM = true

        setTimeout(function() {
          handleLeaveRoom()
        }, 3000)
      }
    }

    const handleBan = function (payload) {
      const {
        roomId,
        userId
      } = payload

      if ($rootScope.chatRoomId === roomId) {
        debug(`Banned: roomId:${roomId} userId:${userId}`)

        $scope.adminMessages.push({ content: `You were removed from roomId ${roomId} by userId ${userId}` })
        $scope.isShowingAM = true

        setTimeout(function() {
          handleLeaveRoom()
        }, 3000)
      }
    }

    const handlePM = function (payload) {
      const { fromUserId, content } = payload

      $scope.privateMessages.push({
        content,
        fromUser: {
          id: fromUserId,
          name: ($rootScope.userList.find(u => u.id === fromUserId) || { username: 'Someone' }).username
        }
      })
      $scope.isShowingPM = true
    }

    const handleInvite = function (payload) {
      const {
        roomId,
        roomName,
        password,
        fromUserId
      } = payload

      const passwordMessage = password ? ` Use password "${password}" for access.` : ''

      $scope.adminMessages.push({ content: `You were invited to join the room "${roomName}" (ID: ${roomId}) by userId ${fromUserId}.${passwordMessage}` })
      $scope.isShowingAM = true
    }

    const handleRoomChat = function (payload) {
      const {
        roomId,
        userId,
        content
      } = payload

      if ($rootScope.chatRoomId !== roomId) {
        debug(`$rootScope.chatRoomId:${$rootScope.chatRoomId} does not equal to roomId:${roomId} received`)

        return
      }
      $scope.chatMessages.push({
        content,
        user: {
          id: userId,
          username: ($rootScope.userList.find(u => u.id === userId) || { username: 'Someone' }).username
        }
      })
    }

    const refreshInroomOutsideUserList = function () {
      const currentRoom = $rootScope.roomList.find(room => room.id === $rootScope.chatRoomId)

      if (!currentRoom) return

      $scope.outsideUserList = $rootScope.userList.filter(u => !currentRoom.userIds.includes(u.id)).map(u => {
        return Object.assign({}, u, {
          isBanned: currentRoom.bannedUserIds.includes(u.id)
        })
      })
      $scope.inroomUserList = $rootScope.userList.filter(u => currentRoom.userIds.includes(u.id))
    }

    publicSocket.on('PSA', function(data) {
      switch(data.type) {
        case 'USERLIST_REFRESH':
          $rootScope.userList = data.payload
          break;
        case 'ROOMLIST_REFRESH':
          $rootScope.roomList = data.payload
          $scope.publicRoomList = getPublicRoomList(data.payload)
          $scope.privateRoomList = getPrivateRoomList(data.payload)
          refreshInroomOutsideUserList()
          break;
        default:
          console.error('UNIDENTIFIED_DATA:PSA', data)
      }
    })

    publicSocket.on('SSA', function(data) {
      switch(data.type) {
        case 'ADMIN_KICK':
          handleKick(data.payload)
          break;
        case 'ADMIN_BAN':
          handleBan(data.payload)
          break;
        case 'PRIVATE_MESSAGE':
          handlePM(data.payload)
          break;
        case 'INVITATION':
          handleInvite(data.payload)
          break;
        case 'ROOM_CHAT':
          handleRoomChat(data.payload)
          break;
        default:
          console.error('UNIDENTIFIED_DATA:SSA', data)
      }
    })

    $scope.onAttemptJoinPrivateRoom = function (roomId) {
      const passwordInput = $scope.privateRoomListJoinPasswordInput

      if (!passwordInput) {
        debug('No password provided from joining private room')

        return
      }

      $scope.privateRoomListJoinPasswordInput = ''
      handleJoinRoom(roomId, true, passwordInput)
    }

    $scope.onAttemptToJoinRoom = function (roomId) {
      handleJoinRoom(roomId, false)
    }

    $scope.onCreatePrivateRoom = function () {
      const roomName = $scope.privateRoomListCreateRoomNameInput
      const password = $scope.privateRoomListCreateRoomPasswordInput

      if (!roomName || !password) {
        debug('No name or password provided from creating private room')

        return
      }

      $scope.privateRoomListCreateRoomNameInput = ''
      $scope.privateRoomListCreateRoomPasswordInput = ''

      handleCreateRoom(true, roomName, password)
    }

    $scope.onCreatePublicRoom = function () {
      const roomName = $scope.publicRoomListCreateRoomNameInput

      if (!roomName) {
        debug('No name provided from creating public room')

        return
      }

      $scope.publicRoomListCreateRoomNameInput = ''

      handleCreateRoom(false, roomName)
    }

    $scope.onPrivateMessageSubmit = function () {
      const targetUserId = parseInt($scope.privateMessageUserIdInput)
      const content = $scope.privateMessageContentInput

      if (!targetUserId || !content) {
        debug('No targetUserId or content provided from sending private message')

        return
      }

      $scope.privateMessageUserIdInput = 0
      $scope.privateMessageContentInput = ''

      sendPrivateMessage(content, targetUserId)
    }

    $scope.onLeaveRoom = function () {
      handleLeaveRoom()
    }

    $scope.onChatMessageInputSubmit = function () {
      const content = $scope.chatMessageInput

      if (!content) {
        debug('No content was provided when onChatMessageInputSubmit')

        return
      }
      sendChatRoomMessage(content)
      $scope.chatMessageInput = ''
    }

    $scope.inviteUser = function (userId) {
      sendInvitation(userId)
    }

    $scope.unbanUser = function (userId) {
      unbanUser(userId)
    }

    $scope.kickUser = function (userId) {
      kickUser(userId)
    }
    $scope.banUser = function (userId) {
      banUser(userId)
    }

    $scope.$on('$destroy', function (event) {
      publicSocket.removeAllListeners()
      delete window.onbeforeunload
    })

    if ($rootScope.chatRoomId) loadMessageHistory($rootScope.chatRoomId)

    window.onbeforeunload = function () {
      postToEndpoint({
        url: endpoints.logout,
        payload: {
          token: $rootScope.token,
          currentRoomId: $rootScope.chatRoomId || null
        },
        callback: function () {}
      })
      
    }
  }
])
