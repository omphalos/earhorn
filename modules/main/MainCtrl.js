angular.module('app').config(['$routeProvider', function($routeProvider) {
  // The default is main.html.
  $routeProvider.otherwise({
    templateUrl:'/modules/main/main.html',
    controller:'MainCtrl'
  })
}])

angular.module('main').controller('MainCtrl', [
  '$scope',
  '$location',
  'logClient',
  'timeline',
  'settingsService',
  'consoleInterface', function(
  $scope,
  $location,
  logClient,
  timeline,
  settingsService,
  consoleInterface) {
    
  //////////////////////
  // Set up Settings. //
  //////////////////////
  
  settingsService.loadAnd$watch($scope, 'settings')

  /////////////////////////
  // Timeline functions. //
  /////////////////////////
  
  $scope.fastBackward = function() { console.log('gast backward') }
  $scope.stepBackward = function() { console.log('step backward') }
  $scope.pause = function() { console.log('pause') }
  $scope.play = function() { console.log('play') }
  $scope.stepForward = function() { console.log('step forward') }
  $scope.fastForward = function() { console.log('fast forward') }

  ////////////////////
  // Editor's code. //
  ////////////////////
  
  $scope.hasScripts = function() {
    return Object.keys(timeline.programState.scripts).length
  }
  $scope.timeline = timeline

  /////////////////////////////////////
  // Build an iframe when requested. //
  /////////////////////////////////////
  
  var path = $location.path()
    , iframeIndex = path.lastIndexOf('iframe=')

  if(iframeIndex >= 0)
    $scope.iframe = path.substring(iframeIndex + 'iframe='.length)
  
  /////////////////////////////////
  // Create a console interface. //
  /////////////////////////////////
  
  $scope.arguments = arguments
  $scope.consoleInterface = {
    
    // Expose the settings object.
    settings: $scope.settings,
    
    // Timeline functions.
    stepBackward: $scope.stepBackward,
    fastBackward: $scope.fastBackward,
    pause: $scope.pause,
    play: $scope.play,
    stepForward: $scope.stepForward,
    fastForward: $scope.fastForward,   
    timeline: timeline,
    
    // Expose the $scope for ease of development.
    MainCtrl: $scope
  }
  
  consoleInterface.expose($scope, 'consoleInterface')

}])
