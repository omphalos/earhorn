angular.module('app').config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({
    templateUrl:'/modules/main/main.html',
    controller:'MainCtrl'
  })
}])

angular.module('main').controller('MainCtrl', [
  '$scope',
  '$location',
  '$interval',
  'logClient',
  'settingsService', function(
  $scope,
  $location,
  $interval,
  logClient,
  settingsService) {
    
  ///////////////
  // Settings. //
  ///////////////
  
  settingsService.attach($scope, 'settings', 'earhorn-settings', {
    historyLen: 100,
    interval: 0,
    formatDigits: 2
  })
  
  /////////////////////////
  // Timeline functions. //
  /////////////////////////
  
  $scope.fastBackward = function() { console.log('gast backward') }
  $scope.stepBackward = function() { console.log('step backward') }
  $scope.pause = function() { console.log('pause') }
  $scope.play = function() { console.log('play') }
  $scope.stepForward = function() { console.log('step forward') }
  $scope.fastForward = function() { console.log('fast forward') }

  /////////////////////////////////
  // Create a console interface. //
  /////////////////////////////////
  
  // TODO: create a console interface service
  
  $scope.arguments = arguments
  $scope.public = {
    
    // Expose the settings object.
    settings: $scope.settings,
    
    // Timeline functions.
    stepBackward: $scope.stepBackward,
    fastBackward: $scope.fastBackward,
    pause: $scope.pause,
    play: $scope.play,
    stepForward: $scope.stepForward,
    fastForward: $scope.fastForward,   
    
    // Expose the $scope for ease of development.
    MainCtrl: $scope,
    
    // Help.
    help: function() {
      Object.keys($scope.public).forEach(function(key) {
        console.log(key)
      })
    }
  }

  // Expose in global scope for ease of console use
  Object.keys($scope.public).forEach(function(key) {
    if(window.hasOwnProperty(key)) throw 'Name conflict: ' + key
    window[key] = $scope.public[key]
  })
  
  // User shouldn't have to call $digest
  $interval(function() {}, 100)
  
  ///////////////////////////
  // Subscribe to the log. //
  ///////////////////////////

  logClient.subscribe()
  
  ///////////////////////////////////
  // Build an iframe if requested. //
  ///////////////////////////////////
  
  var path = $location.path()
    , iframeIndex = path.lastIndexOf('iframe=')
  if(iframeIndex >= 0) $scope.iframe = path.substring(iframeIndex + 'iframe='.length)

  /////////////////////////
  // Do proper clean up. //
  /////////////////////////
  
  $scope.$on('$destroy', function() {
    logClient.unsubscribe()
    Object.keys($scope.public).forEach(function(key) { delete window[key] })
  })
  
}])
