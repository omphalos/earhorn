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
  'consoleInterface',
  '$compile', function(
  $scope,
  $location,
  logClient,
  timeline,
  settingsService,
  consoleInterface,
  $compile) {
    
  //////////////////////////
  // Set up our services. //
  //////////////////////////
  
  settingsService.loadAnd$watch($scope, 'settings', { formatDigits: 2 })

  ///////////////
  // Timeline. //
  ///////////////

  $scope.timeline = timeline
  
  // Two-way binding for position.
  $scope.timelinePosition = timeline.position
  
  $scope.$watch('timelinePosition', function(newVal, oldVal) {
    timeline.position = +newVal
  })
  
  timeline.$watch('position', function(newVal, oldVal) {
    $scope.timelinePosition = newVal
  })

  // Traversal functions.
  $scope.fastBackward = function() { console.log('gast backward') }
  $scope.stepBackward = function() { console.log('step backward') }
  $scope.pause = function() { console.log('pause') }
  $scope.play = function() { console.log('play') }
  $scope.stepForward = function() { console.log('step forward') }
  $scope.fastForward = function() { console.log('fast forward') }

  ////////////////////
  // Program state. //
  ////////////////////
  
  var programState = $scope.programState = timeline.programState

  $scope.hasScripts = function() {
    return Object.keys(timeline.programState.scripts).length
  }
  
  var getCurrentScript = $scope.getCurrentScript = function() {
    return programState.scripts[programState.currentScript] || {}
  }
  
  function updateCode() {
    $scope.code = getCurrentScript().body
  }
  
  function updateLocation() {
    var location = (programState.currentLoc || '').split(',')
    $scope.currentLine = +location[2]
    $scope.currentCh = +location[3]
  }

  $scope.getLogs = function() {
    return timeline.isPlaying() ? programState.logs : {}
  }
  
  $scope.getCurrentScriptLogs = function() {
    return getCurrentScript().logs
  }
  
  $scope.getLogText = function(log) {
    
    log = log.val
    
    if(log.type === 'String')
      return '"' + htmlEscape(log.value) + '"' + (log.clipped ? '...' : '')

    if(log.type === 'Number') {
      if(!log.value || !settings.formatDigits) return log.value
      return log.value.toFixed(settings.formatDigits)
    }
      
    if(log.type === 'Function')
      return log.name || log.type
      
    if(typeof log.value !== 'undefined')
      return '' + log.value
        
    if(log.type === 'Array')
      return 'Array(' + log.length + ')'
          
    if(log.type === 'Object')        
      return log.constructor || log.type
            
    return log.type
  }  
  
  timeline.$watch('isPlaying()', function(newVal) {
    console.log('isPlaying $watch')
    if(!newVal) return
    updateCode()
    updateLocation()
  })

  $scope.$watch('getCurrentScript().body', updateCode)
  $scope.$watch('programState.currentLoc', updateLocation)
  // $scope.$watch('getCurrentScript().logs', updateLogs, true)

  ////////////////////////////////
  // Support inspection widget. //
  ////////////////////////////////

  $scope.toggleWidget = function($event, log) {

    $event.stopPropagation()
    
    if($scope.widgetLog === log)
      return delete $scope.widgetLog
    
    $scope.widgetLog = log
    $scope.widgetLine = log.loc.to.line
    $scope.widgetCh = log.loc.to.column
  }

  $scope.widgetLine = 4
  $scope.widgetCh = 4
  
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
