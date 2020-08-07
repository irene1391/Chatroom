app.controller('loginController', [
  '$scope',
  '$rootScope',
  '$location',
  '$routeParams',
  'publicSocket',
  '$window',
  '$http',
  function ($scope, $rootScope, $location, $routeParams, publicSocket, $window, $http) {
    $rootScope.token = ''
    $rootScope.username = ''
    $rootScope.userId = ''

    $scope.showMessage = false
    $scope.message = ''

    $scope.loginUsername = ''
    $scope.loginPassword = ''

    const showMessage = function (message) {
      $scope.showMessage = true
      $scope.message = message
    }
    const hideMessage = function () {
      $scope.showMessage = false
      $scope.message = ''
    }
    const clearLogin = function () {
      $scope.loginUsername = ''
      $scope.loginPassword = ''
    }

    const postToEndpoint = function ({ url, payload, callback }) {
      $http({
        url,
        method: 'POST',
        data: JSON.stringify(payload),
        headers: {'Content-Type': 'application/json'}
      }).success(callback)
    }

    $scope.onLogin = function () {
      const username = $scope.loginUsername
      const password = $scope.loginPassword

      const payload = {
        username,
        password
      }

      hideMessage()

      if (username && password) {
        postToEndpoint({
          url: endpoints.login,
          payload,
          callback: function (response) {
            const {
              isSuccessful,
              errorMessage
            } = response

            if (!isSuccessful) {
              clearLogin()

              if (errorMessage) showMessage(errorMessage)

              return
            }

            clearLogin()
            $rootScope.token = response.token
            $rootScope.username = response.username
            $rootScope.userId = response.userId

            publicSocket.emit('REGISTER', {
              token: response.token
            })

            $location.path('/')
          }
        })
      } else {
        showMessage('Both fields are required.')
      }
    }

    $scope.onSignup = function () {
      const username = $scope.loginUsername
      const password = $scope.loginPassword
      const payload = {
        username,
        password
      }

      hideMessage()

      if (username && password) {
        postToEndpoint({
          url: endpoints.signup,
          payload,
          callback: function (response) {
            const {
              isSuccessful,
              errorMessage
            } = response

            if (!isSuccessful) {
              clearLogin()

              if (errorMessage) showMessage(errorMessage)

              return
            }

            clearLogin()
            showMessage('Signup succeeded, you can now login with your credentials.')
          }
        })
      } else {
        showMessage('Both fields are required.')
      }
    }
  }
])