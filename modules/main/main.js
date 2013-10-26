angular.module('app').config(['$routeProvider', function($routeProvider) {

  $routeProvider.otherwise({
    templateUrl:'/modules/main/main.html',
    controller:'MainCtrl'
  })
}])

angular.module('main', ['editor'])
angular.module('main').controller('MainCtrl', [
  '$scope',
  '$location',
  '$interval', function(
  $scope,
  $location,
  $interval) {
    
  ///////////////
  // Settings. //
  ///////////////
      
  $scope.settings = JSON.parse(
    localStorage.getItem('earhorn-settings') ||
    JSON.stringify({
      historyLen: 100,
      interval: 0,
      formatDigits: 2
    }))
  
  $scope.$watch('settings', function(newVal, oldVal) {
    if(newVal === oldVal) return
    localStorage.setItem('earhorn-settings', JSON.stringify(newVal))
  }, true)
  
  function onStorage(evt) {
    if(evt.key !== 'earhorn-settings') return
    $scope.$apply(function() {
      angular.copy(JSON.parse(evt.newValue), $scope.settings)
    })
  }
    
  window.addEventListener('storage', onStorage, false)

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
    window.removeEventListener('storage', onStorage, false)
    Object.keys($scope.public).forEach(function(key) { delete window[key] })
  })
  
}])
