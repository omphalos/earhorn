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
    autosave: false,
    keys: {
      'mod+p': 'play()',
      'mod+m': 'timeline.fastBackward()',
      'mod+,': 'timeline.stepBackward()',
      'mod+.': 'timeline.stepForward()',
      'mod+/': 'timeline.fastForward()'
    }
  })

  ///////////////
  // Timeline. //
  ///////////////

  $scope.timeline = timeline
  
  // Two-way binding for position.
  $scope.timelinePosition = timeline.getPosition()
  
  $scope.$watch('timelinePosition', function(newVal, oldVal) {
    timeline.setPosition(+newVal)
  })
  
  $scope.$watch('timeline.getPosition()', function(newVal, oldVal) {
    $scope.timelinePosition = newVal
  })

  timeline.$on('main.timeline', _.debounce(function() {
    if(!$scope.$$phase) $scope.$digest()
  }, 100))

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

    if($scope.editing) return {}

    var bookmarks = {}
      , logs = getCurrentScript().logs || {}
      
    Object.keys(logs).forEach(function(key) {

      var log = logs[key]

      bookmarks[key] = {
        key: key,
        loc: log.loc,
        caught: log.caught,
        text: $scope.getLogText(log.val)
      }
    })
    
    return bookmarks
  }
  
  $scope.$watch('timeline.isPlaying()', function(newVal) {
    if(!newVal) return
    $scope.editing = false
    updateCode()
    updateLocation()
  })

  $scope.$watch('getCurrentScript().body', updateCode)
  $scope.$watch('programState.currentLoc', updateLocation)

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
  
  var debouncedEdit = _.debounce(function(newVal) {
    var editScript = programState.currentScript // TODO    
    logClient.edit(editScript, newVal)
  })
  
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
        script: programState.currentScript, // TODO
        key: err.toString()
      }
    }
  }, 250)
  
  logClient.$on('main.logClient.edit', function(evt, record) {
    
    console.log('main.logClient.edit event received')
    
    // TODO: maybe timeline should handle edit state as well?
    
    var target = programState.scripts[record.script]
    if(!target) return
    
    target.body = record.body

    if($scope.editing && record.script === programState.currentScript) // TODO: right value?
      $scope.code = record.body
      
    if(!$scope.$$phase) $scope.$digest() // necessary?
  })
  
  $scope.$watch('code', function(newVal, oldVal) {
    
    debouncedValidate(newVal)

    $scope.editing = newVal !== getCurrentScript().body
    
    if(!$scope.editing) return
    
    timeline.pause()
    timeline.clear()
    getCurrentScript().body = newVal

    if(settings.autosave)    
      debouncedEdit(newVal)
  })

  $scope.reset = function(script) {
    logClient.reset(script || programState.currentScript)
  }
  
  $scope.play = function() {
    timeline.clear()
    debouncedEdit($scope.code)
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

  function getParseErrorScripts() {
    
    var scripts = 
      [programState.currentScript]. // Make sure currentScript is first
      concat(Object.keys(programState.scripts))
      
    return scripts.
      filter(function(s) { return s && programState.scripts[s].parseError })
  }

  $scope.getParseErrors = function() {

    return getParseErrorScripts().
    
      map(function(key) {
        var parseError = programState.scripts[key].parseError
        return key + ' (' + (parseError.line + 1) + '): ' + parseError.message + '.'
      })
  }

  $scope.goToError = function() {
    var script = getParseErrorScripts()[0]
    timeline.pause()
    // TODO handle different script than programState.currentScript
    programState.currentScript = script
    var error = programState.scripts[script].parseError
    $scope.currentLine = error.line
    $scope.currentCh = error.ch
    $scope.editorFocus = true
  }
  
  $scope.getLineWidgets = function() {

    var lineWidgets = {}
      
    if(!$scope.parseError) return lineWidgets
    
    var indent = ''
    for(var i = 1; i < $scope.parseError.ch; i++)
      indent += ' '
    
    lineWidgets['error@' + $scope.parseError.key] = {
      template: 'errorLineWidgetTemplate',
      line: $scope.parseError.line,
      model: indent + $scope.parseError.message
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
      if(!log.value || !settings.display.formatDigits) return log.value
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

  /////////////////////////////////////
  // Build an iframe when requested. //
  /////////////////////////////////////
  
  var path = $location.path()
    , iframeIndex = path.lastIndexOf('iframe=')

  if(iframeIndex >= 0)
    $scope.iframe = path.substring(iframeIndex + 'iframe='.length)

  //////////////////////
  // Revert changes. //
  //////////////////////

  $scope.revertChanges = function() {
    $scope.editing = false
    logClient.reset(programState.currentScript)
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
    
    // Expose the $scope for ease of development.
    timeline: timeline,
    programState: programState,
    MainCtrl: $scope
  }
  
  consoleInterface.expose($scope, 'consoleInterface')

}])
