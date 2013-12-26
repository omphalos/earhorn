angular.module('app').config(['$routeProvider', function($routeProvider) {
  // The default is main.html.
  $routeProvider.otherwise({
    templateUrl:'/earhorn/modules/main/main.html',
    controller:'MainCtrl'
  })
}])

angular.module('main').controller('MainCtrl', [
   '$scope',
  '$location',
  'logClient',
  'timelineFactory',
  'settingsService',
  'consoleInterface',
  '$compile', 
  '$timeout', function(
  $scope,
  $location,
  logClient,
  timelineFactory,
  settingsService,
  consoleInterface,
  $compile,
  $timeout) {

  //////////////////////////
  // Set up our services. //
  //////////////////////////
  
  settingsService.loadAnd$watch($scope, 'settings', {
    display: {
      stepForward: true,
      stepBackward: true,
      fastForward: false,
      fastBackward: false,
      pause: true,
      play: true,
      formatDigits: 2
    },
    keys: {
      'mod+p': 'play()',
      'mod+m': 'timeline.fastBackward()',
      'mod+,': 'timeline.stepBackward()',
      'mod+.': 'timeline.stepForward()',
      'mod+/': 'timeline.fastForward()',
      'mod+o': 'selectScript()'
    }
  })
  
  $scope.$watch('editScript', function() {
    $scope.editorFocus = true
  })

  $scope.selectScript = function() {
    $scope.editorFocus = false
    $scope.$broadcast('selectScript')
  }
  
  ///////////////
  // Timeline. //
  ///////////////

  var timeline = $scope.timeline = timelineFactory()
  
  // Two-way binding for position.
  $scope.timelinePosition = timeline.getPosition()
  
  $scope.$watch('timelinePosition', function(newVal, oldVal) {
    timeline.setPosition(+newVal)
    $scope.editorFocus = true
  })
  
  $scope.$watch('timeline.getPosition()', function(newVal, oldVal) {
    $scope.timelinePosition = newVal
  })

  timeline.$on('main.timeline', _.debounce(function() {
    updateLocation()
    if(!$scope.$$phase) $scope.$digest()
  }), 100)

  ////////////////////
  // Program state. //
  ////////////////////
  
  var programState = $scope.programState = timeline.programState

  $scope.getScriptCount = function() {
    return Object.keys(programState.scripts).length
  }
  
  var getEditScript = $scope.getEditScript = function() {
    return programState.scripts[$scope.editScript] || {}
  }
  
  function updateCode() {

    if($scope.editing) return

    $scope.code = getEditScript().body
  }
  
  function updateLocation() {   

    // Don't auto-navigate when editng or there's nowhere to navigate to.
    // Don't auto-navigate when playing if we're showing a script.
    // (If we're playing and not showing a script,
    // we can autonavigate to initialize editScript.)
    if($scope.editing || !timeline.isPlaying()) return
    
    navigateToCurrentLocation()
  }
  
  function navigateToCurrentLocation() {
    
    $scope.editScript = programState.currentScript
    
    if(programState.currentLoc) {
      var location = programState.currentLoc.split(',')
      $scope.currentLine = +location[2]
      $scope.currentCh = +location[3]
    } else {
      $scope.currentLine = 0
      $scope.currentCh = 0
    }
  }

  $scope.getBookmarks = function() {

    if($scope.editing) return {}

    var bookmarks = {}
      , logs = getEditScript().logs || {}
      
    Object.keys(logs).forEach(function(key) {

      var log = logs[key]

      bookmarks[key] = {
        key: key,
        loc: log.loc,
        caught: log.caught
      }
    })

    /*
    var newKeys = Object.keys(bookmarks).join(' ')
    if($scope.bookmarkLog !== newKeys)
      console.log('bookmarks', $scope.bookmarkLog = newKeys)
    */
    
    return bookmarks
  }
  
  $scope.$watch('timeline.isPlaying()', function(newVal) {
    if(!newVal) return
    $scope.editing = false
    updateCode()
    updateLocation()
  })

  $scope.$watch('getEditScript().body', updateCode)
  $scope.$watch('programState.currentLoc', updateLocation)
  $scope.$watch('getScriptCount()', updateLocation)

  ///////////
  // Mode. //
  ///////////
  
  $scope.getMode = function() {
    return (
      $scope.editing ? 'Editing' :
      timeline.isPlaying() ? 'Playing' :
      'Paused'
    )
  }

  ////////////////
  // Edit code. //
  ////////////////
  
  $scope.editing = false
  
  var debouncedValidate = _.debounce(function(newVal) {

    try {
      
      esprima.parse(newVal)
      $scope.parseError = null
    } catch(err) {

      var message = err.toString()
      message = message.substring(message.indexOf(': ') + 2)
      message = message.substring(message.indexOf(': ') + 2)
      
      $scope.parseError = {
        line: err.lineNumber - 1,
        ch: err.column - 1,
        message: message,
        script: $scope.editScript,
        key: err.toString()
      }
    }
    
    if(!$scope.$$phase) $scope.$digest()

  }, 250)
  
  logClient.$on('main.logClient.edit', function(evt, record) {
    
    console.log('main.logClient.edit event received')
    
    // TODO: maybe timeline should handle edit state as well?
    
    var target = programState.scripts[record.script]
    if(!target) return
    
    target.body = record.body

    if($scope.editing && record.script === $scope.editScript)
      $scope.code = record.body
      
    if(!$scope.$$phase) $scope.$digest() // necessary?
  })
  
  $scope.$watch('code', function(newVal, oldVal) {
    
    debouncedValidate(newVal)

    if(newVal === getEditScript().body) return
    
    $scope.editing = true
    
    timeline.pause()
    timeline.clear()
  })

  $scope.reset = function(script) {
    logClient.reset(script)
  }
  
  $scope.play = function() {
    timeline.clear()
    delete $scope.widgetKey
    getEditScript().body = $scope.code
    logClient.edit($scope.editScript, $scope.code)
    timeline.play()
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

  /////////////
  // Errors. //
  /////////////

  $scope.showParseError = function() {
    if($scope.currentLine === void 0 || !$scope.parseError) return false
    var diff = Math.abs($scope.currentLine - $scope.parseError.line)
    return diff > 10
  }

  $scope.goToError = function() {
    if(!$scope.parseError) return
    $scope.currentLine = $scope.parseError.line
    $scope.currentCh = $scope.parseError.ch
    $scope.editorFocus = true
  }
  
  $scope.getLineWidgets = function() {

    var lineWidgets = {}
      
    if(!$scope.parseError) return lineWidgets
    
    var indent = ''
    for(var i = 1; i < $scope.parseError.ch; i++)
      indent += ' '
    
    lineWidgets[$scope.parseError.key] = {
      template: 'errorLineWidgetTemplate',
      line: $scope.parseError.line,
      model: indent + '* ' + $scope.parseError.message
    }
    
    return lineWidgets
  }
  
  ////////////////////////////////
  // Support inspection widget. //
  ////////////////////////////////

  $scope.toggleWidget = function($event, key) {

    $event.stopPropagation()
    
    if($scope.widgetKey === key)
      return delete $scope.widgetKey
    
    $scope.widgetScript = $scope.editScript
    $scope.widgetKey = key
    var log = $scope.getWidgetLog()
    $scope.widgetLine = log.loc.to.line
    $scope.widgetCh = log.loc.to.column
  }

  $scope.getWidgetLog = function() {

    var script = $scope.getEditScript()
    
    var widgetLog =
      $scope.widgetKey && 
      script &&
      script.logs && 
      script.logs[$scope.widgetKey]
      
    return widgetLog
  }

  $scope.widgetLine = 4
  $scope.widgetCh = 4

  ////////////////
  // getLogText //
  ////////////////
  
  $scope.hasLogForKey = function(key) {
    return getEditScript().logs[key]
  }
  
  $scope.getLogTextForKey = function(key) {
    var log = $scope.hasLogForKey(key)
    return log ? $scope.getLogText(log.val) : null
  }
  
  $scope.getLogText = function(log) {

    if(!log) return 'ERROR'
    
    if(log.type === 'String') {

      var str = log.value
      
      if(str.indexOf('\n') >= 0)
        return '"' + str.substring(0, str.indexOf('\n')) + '"...'

      return '"' + str + '"' + (log.clipped ? '...' : '')
    }

    if(log.type === 'Number') {
      if(typeof log.value === 'string') return log.value
      return log.value.toFixed(settings.display.formatDigits)
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
  
  $scope.isCurrent = function(key) {
    return (
      $scope.editScript == programState.currentScript && 
      key == programState.currentLoc)
  }

  /////////////////////////////////////
  // Build an iframe when requested. //
  /////////////////////////////////////
  
  var path = $location.path().substring($location.path().indexOf('/') + 1)
  if(path) {
    
    var iframeIndex = path.lastIndexOf('iframe=')
      , paramString
    
    if(iframeIndex >= 0) {
      $scope.iframe = path.substring(iframeIndex + 'iframe='.length)
      paramString = path.substring(0, iframeIndex)
    } else paramString = path

    paramString.
      split(',').
      filter(function(x) { return x }).
      map(function(x) { return x.split('=') }).
      forEach(function(x) { $scope[x[0]] = eval(x[1]) })
  }

  //////////////////////
  // Revert changes. //
  //////////////////////

  $scope.revertChanges = function() {
    $scope.editing = false
    logClient.reset($scope.editScript)
    timeline.play()
  }

  $scope.revertAllChanges = function() {
    
    $scope.editing = false
    
    Object.keys(programState.scripts).forEach(function(script) {
      logClient.reset(script)
    })
    
    timeline.play()
  }
  
  ///////////////////////////
  // Support key-bindings. //
  ///////////////////////////

  var commandToKey = {};

  $scope.$watch('settings.keys', function(newVal, oldVal) {

    commandToKey = {}  

    Mousetrap.reset()

    Object.keys(settings.keys || {}).forEach(function(key) {

      var command = settings.keys[key]

      commandToKey[command] = key

      Mousetrap.bindGlobal(key, function(evt) {

        eval(command)

        if(!$scope.$$phase)
          $scope.$digest()

        if(evt.preventDefault) 
          evt.preventDefault()
        else evt.returnValue = false
      })
    })
  }, true)

  $scope.tooltipFor = function(label, command) {
    var key = commandToKey[command]
    if(!key) return label
    return label + ' ( ' + key + ' )'
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
    stepForward: timeline.stepForward,
    fastForward: timeline.fastForward,   
    play: $scope.play, // TODO: can this be a $watch instead?

    // Miscellaneous utilities.
    revertChanges: $scope.revertChanges,
    revertAllChanges: $scope.revertAllChanges,
    selectScript: $scope.selectScript,
    
    // Expose the $scope for ease of development.
    timeline: timeline,
    programState: programState,
    MainCtrl: $scope,
    getEditScript: $scope.getEditScript
  }
  
  consoleInterface.expose($scope, 'consoleInterface')

  $timeout(function() {
    $scope.timerElapsed = true;
  }, 2000)

}])
