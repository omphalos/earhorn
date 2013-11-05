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
  var programState = $scope.programState = timeline.programState
  
  $scope.getCurrentScript = function() {
    return programState.scripts[programState.currentScript] || {}
  }
  
  $scope.getCurrentScriptBody = function() {
    return $scope.getCurrentScript().body
  }
  
  function updateCodeWhenScriptIsRunning() {
    if(!timeline.isPlaying()) return console.log('not playing')
    //console.log('updating')
    $scope.code = $scope.getCurrentScriptBody()
    var location = (programState.currentLoc || '').split(',')
    $scope.currentLine = +location[2] - 1
    $scope.currentCh = +location[3]
  }
  timeline.$watch('isPlaying()', updateCodeWhenScriptIsRunning)
  $scope.$watch('getCurrentScriptBody()', updateCodeWhenScriptIsRunning)
  $scope.$watch('programState.currentLoc', updateCodeWhenScriptIsRunning)
  
  $scope.timelinePosition = timeline.position
  $scope.$watch('timelinePosition', function(newVal, oldVal) {
    timeline.position = +newVal
  })
  timeline.$watch('position', function(newVal, oldVal) {
    $scope.timelinePosition = newVal
  })

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
    stepBackward: timeline.stepBackward,
    fastBackward: timeline.fastBackward,
    pause: timeline.pause,
    play: timeline.play,
    stepForward: timeline.stepForward,
    fastForward: timeline.fastForward,   
    
    // Expose the $scope for ease of development.
    timeline: timeline,
    programState: programState,
    MainCtrl: $scope
  }
  
  consoleInterface.expose($scope, 'consoleInterface')

}])
