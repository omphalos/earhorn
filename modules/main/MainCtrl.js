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
      revert: true,
      saveAndReload: true,
      stepForward: true,
      stepBackward: true,
      fastForward: false,
      fastBackward: false,
      pause: true,
      play: true,
      formatDigits: 2
    },
    keys: {
      'mod+s': 'saveAndReload()',
      'mod+p': 'play()',
      'mod+m': 'fastBackward()',
      'mod+,': 'stepBackward()',
      'mod+.': 'stepForward()',
      'mod+/': 'fastForward()',
      'mod+o': 'open()'
    }
  })
  
  $scope.$watch('editScript', function(newValue) {
    $scope.editorFocus = true
  })

  $scope.open = function() {
    if($scope.getScriptCount() <= 1) return
    $scope.editorFocus = false
    $scope.$broadcast('open')
  }
  
  ///////////////
  // Timeline. //
  ///////////////

  var timeline = $scope.timeline = timelineFactory()
  
  // Two-way binding for position.
  $scope.timelinePosition = timeline.getPosition()
  
  $scope.$watch('timelinePosition', function(newVal, oldVal) {
    timeline.setPosition(+newVal)
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
 
  function updateLocation() {   

    // Don't auto-navigate when editng or there's nowhere to navigate to.
    // Don't auto-navigate when playing if we're showing a script.
    // (If we're playing and not showing a script,
    // we can autonavigate to initialize editScript.)
    if($scope.editing || (timeline.isPlaying() && $scope.editScript))
      return
    
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
        caught: log.caught,
        messageLoss: !!log.lostMessageCounts
      }
    })

    return bookmarks
  }
  
  $scope.$watch('timeline.isPlaying()', function(newVal) {
    if(!newVal) return
    $scope.editing = false
    updateLocation()
  })

  $scope.$watch('programState.currentLoc', updateLocation)
  $scope.$watch('getScriptCount()', function() {
    updateLocation()
  })

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

  var parseMessageID = 0
    , parser

  if(typeof Worker === undefined) {
    
    console.warn('Web workers not supported.')
    parser = { postMessage: function() { } }
    
  } else {

    parser = new Worker('/earhorn/modules/main/esprima-web-worker.js')
    
    parser.addEventListener('message', function (evt) {
            
      if(evt.data.id !== parseMessageID) return
      
      if(evt.data.type === 'error') {
      
        var err = evt.data
              
        $scope.parseError = {
          line: err.line,
          ch: err.ch,
          message: err.message,
          script: $scope.editScript,
          key: err.line + ': ' + err.message
        }
      } else delete $scope.parseError
      
      if(!$scope.$$phase) $scope.$digest()
    })    
    
  }

  $scope.$watch('getEditScript().body', function(code) {
    parser.postMessage({ id: ++parseMessageID, code: code })
  })

  $scope.$on('userCodeEdit', function() {
    $scope.editing = true
    timeline.pause()
    timeline.clear()
  })

  $scope.reset = function(script) {
    logClient.reset(script)
  }
  
  $scope.play = function() {
    if($scope.editing)
      $scope.saveAndReload()
    else {
      timeline.play()
      navigateToCurrentLocation()
    }
    $scope.editorFocus = true
  }
  
  ;['pause',
    'stepBackward',
    'stepForward',
    'fastBackward',
    'fastForward'
  ].forEach(function(action) {
    $scope[action] = function() {
      timeline[action]()
      ;$scope.editorFocus = true
    }
  })
  
  $scope.saveAndReload = function() {
    if(!$scope.editScript) return
    timeline.clear()
    delete $scope.widgetKey
    logClient.edit($scope.editScript, $scope.getEditScript().body)
    timeline.play()
    $scope.editorFocus = true
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
    
    if(
      !programState.currentLoc ||
      programState.currentScript !== $scope.editScript) return
    
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

  $scope.goToError = function() {
    if(!$scope.parseError) return
    $scope.currentLine = $scope.parseError.line
    $scope.currentCh = $scope.parseError.ch
    $scope.editorFocus = true
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
      return log.constructorName || log.type
            
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
      forEach(function(x) { $scope[x[0]] = x[1] })
  }

  //////////////////////
  // Revert changes. //
  //////////////////////

  $scope.revert = function() {
    if(!$scope.editScript) return
    if(confirm('Are you sure you want to revert changes to ' + $scope.editScript + '?')) {
      $scope.editing = false
      logClient.reset([$scope.editScript])
      timeline.play()
    }
    $scope.editorFocus = 1
  }

  $scope.revertAllChanges = function() {
    $scope.editing = false
    logClient.reset(Object.keys(programState.scripts))
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
    stepBackward: $scope.stepBackward,
    fastBackward: $scope.fastBackward,
    pause: $scope.pause,
    stepForward: $scope.stepForward,
    fastForward: $scope.fastForward,   
    play: $scope.play,

    // Miscellaneous utilities.
    revertChanges: $scope.revertChanges,
    revertAllChanges: $scope.revertAllChanges,
    open: $scope.open,
    saveAndReload: $scope.saveAndReload,
    
    // Expose the $scope for ease of development.
    timeline: timeline,
    programState: programState,
    Main: $scope,
    getEditScript: $scope.getEditScript
  }
  
  consoleInterface.expose($scope, 'consoleInterface')

  $timeout(function() {
    $scope.timerElapsed = true;
  }, 2000)
}])
