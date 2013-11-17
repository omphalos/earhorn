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
  $scope.timelinePosition = timeline.getPosition()
  
  $scope.$watch('timelinePosition', function(newVal, oldVal) {
    timeline.setPosition(+newVal)
  })
  
  timeline.$watch('getPosition()', function(newVal, oldVal) {
    $scope.timelinePosition = newVal
  })

  ////////////////////
  // Program state. //
  ////////////////////
  
  var programState = $scope.programState = timeline.programState

  $scope.getScriptCount = function() {
    return Object.keys(timeline.programState.scripts).length
  }
  
  var getCurrentScript = $scope.getCurrentScript = function() {
    return programState.scripts[programState.currentScript] || {}
  }
  
  function updateCode() {
    if($scope.editing) return
    $scope.code = getCurrentScript().body
  }
  
  function updateLocation() {
    if($scope.editing) return
    var location = (programState.currentLoc || '').split(',')
    $scope.currentLine = +location[2]
    $scope.currentCh = +location[3]
  }

  $scope.getBookmarks = function() {
    return $scope.editing ? {} : getCurrentScript().logs
  }
  
  timeline.$watch('isPlaying()', function(newVal) {
    if(!newVal) return
    $scope.editing = false
    updateCode()
    updateLocation()
  })

  $scope.$watch('getCurrentScript().body', updateCode)
  $scope.$watch('programState.currentLoc', updateLocation)

  ////////////////
  // Edit code. //
  ////////////////
  
  $scope.editing = false
  
  var debouncedEdit = _.debounce(function(editScript, newVal) {
    logClient.edit(editScript, newVal)
  })
  
  $scope.$watch('code', function(newVal, oldVal) {
    
    var editScript = programState.currentScript // TODO
    
    if(newVal === getCurrentScript().body) return
    
    $scope.editing = true
    
    timeline.pause()
    
    debouncedEdit(editScript, newVal)
  })

  $scope.reset = function(script) {
    logClient.reset(script || programState.currentScript)
  }

  ///////////////////
  // Text markers. //
  ///////////////////

  $scope.markers = {}

  var currentMarkerKey = null
    , hoverMarkerKey = null
    , noMarkers = {}

  $scope.getMarkers = function() {
    return $scope.editing ? noMarkers : $scope.markers
  }

  $scope.hover = function(key, loc) {

    $scope.unhover()

    hoverMarkerKey = 'hover:' + key

    $scope.markers[hoverMarkerKey] = {
      from: { line: loc.from.line, ch: loc.from.column },
      to: { line: loc.to.line, ch: loc.to.column },
      options: { className: 'bookmark-loc' }
    }
  }
  
  $scope.unhover = function() {
    delete $scope.markers[hoverMarkerKey]
  }
  
  $scope.$watch('programState.currentLoc', function() {

    delete $scope.markers[currentMarkerKey]
    
    if(!programState.currentLoc) return
    
    var location = programState.currentLoc.split(',') // TODO use a loc object
      , from = { line: +location[0], ch: +location[1] }
      , to = { line: +location[2], ch: +location[3] }
      
    currentMarkerKey = 'current:' + programState.currentLoc

    $scope.markers[currentMarkerKey] = {
      from: from,
      to: to,
      options: { className: 'current-loc' }
    }
  })

  ////////////////////////////////
  // Support inspection widget. //
  ////////////////////////////////

  $scope.toggleWidget = function($event, key) {

    $event.stopPropagation()
    
    if($scope.widgetKey === key)
      return delete $scope.widgetKey
    
    $scope.widgetScript = programState.currentScript
    $scope.widgetKey = key
    var log = $scope.getWidgetLog()
    $scope.widgetLine = log.loc.to.line
    $scope.widgetCh = log.loc.to.column
  }

  $scope.getWidgetLog = function() {

    var currentScript = $scope.getCurrentScript()
    
    var widgetLog =
      $scope.widgetKey && 
      currentScript &&
      currentScript.logs && 
      currentScript.logs[$scope.widgetKey]
      
    return widgetLog
  }

  $scope.widgetLine = 4
  $scope.widgetCh = 4

  ////////////////
  // getLogText //
  ////////////////
  
  var entityMap = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', 
    '"': '&quot;', '\'': '&#39;', '/': '&#x2F;' 
  }
  
  function htmlEscape(str) {
    
    return str.replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    })
  }
  
  $scope.getLogText = function(log, key) {

    if(!log) return 'ERROR'
    
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
  
  /////////////////////////////////////
  // Build an iframe when requested. //
  /////////////////////////////////////
  
  var path = $location.path()
    , iframeIndex = path.lastIndexOf('iframe=')

  if(iframeIndex >= 0)
    $scope.iframe = path.substring(iframeIndex + 'iframe='.length)
  
  //////////////////////
  // Abandon changes. //
  //////////////////////

  $scope.abandonChanges = function() {
    $scope.editing = false
    logClient.reset(programState.currentScript)
    timeline.play()
  }

  $scope.abandonAllChanges = function() {
    
    $scope.editing = false
    
    Object.keys(programState.scripts).forEach(function(script) {
      logClient.reset(script)
    })
    
    timeline.play()
  }
  
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

    // Miscellaneous utilities.
    abandonAllChanges: $scope.abandonAllChanges,
    
    // Expose the $scope for ease of development.
    timeline: timeline,
    programState: programState,
    MainCtrl: $scope
  }
  
  consoleInterface.expose($scope, 'consoleInterface')

}])
