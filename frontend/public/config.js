app.config([
  '$locationProvider',
  '$routeProvider',
  function ($locationProvider, $routeProvider) {
    $locationProvider.hashPrefix('!')
    $routeProvider
      .when('/', {
        templateUrl: 'views/lobby.html',
        controller: 'mainController',
        resolve: {
          check: function ($rootScope, $location) {
            if (!$rootScope.token){
              $location.path('/login');
            }
          }
        }
      })
      .when('/room/:roomId', {
        templateUrl: 'views/room.html',
        controller: 'mainController',
        resolve: {
          check: function ($rootScope, $location) {
            if (!$rootScope.token){
              $location.path('/login');
            }
          }
        }
      })
      .when('/login', {
        templateUrl: 'views/login.html',
        controller: 'loginController',
        resolve: {
          check: function ($rootScope, $location) {
            if ($rootScope.token){
              $location.path('/');
            }
          }
        }
      })
      .otherwise({
        redirectTo: '/'
      })
  }
])
