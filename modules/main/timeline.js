angular.module('main').factory('timeline', [
  '$rootScope',
  'logClient',
  'programStateFactory',
  'settingsService', function(
  $rootScope,
  logClient,
  programStateFactory,
  settingsService) {

  'use strict'

  /////////////////
  // Initialize. //
  /////////////////

  var timeline = $rootScope.$new()  
    , handlers = {}
    , playing = true
    , settings = settingsService.load({ maxHistoryLength: 100 })
    , position = -1

  timeline.scriptContents = {}
  timeline.history = []
  timeline.programState = programStateFactory.create()
  
  ///////////////////////
  // Player interface. //
  ///////////////////////
  
  timeline.setPosition = function(newVal) {

    movePosition(newVal, position)

    if(newVal !== getEndPosition())
      timeline.pause()
      
    position = newVal
  }
  
  timeline.getPosition = function() {
    return position
  }
  
  function getEndPosition() {
    return timeline.history.length - 1
  }

  function movePositionForward(newVal, oldVal) {
    for(var i = oldVal + 1; i <= newVal && i < timeline.history.length; i++)
      programState.forward(timeline.history[i])
  }
  
  function movePositionBackward(newVal, oldVal) {

    for(var i = oldVal; i > newVal && i >= 0; i--)
      programState.reverse(timeline.history[i])
  }
  
  function movePosition(newVal, oldVal) {
    movePositionForward(newVal, oldVal)
    movePositionBackward(newVal, oldVal)
  }
  
  timeline.isPlaying = function() {
    return playing
  }

  timeline.play = function() {
    timeline.setPosition(getEndPosition())
    playing = true
  }

  timeline.pause = function() {
    playing = false
  }
  
  timeline.step = function(stepSize) {
    timeline.pause()
    var candidate = position + stepSize
    if(candidate < 0 || candidate >= timeline.history.length) return
    timeline.setPosition(candidate)
  }
  
  timeline.stepForward = function() { 
    timeline.step(1) 
  } 
  
  timeline.stepBackward = function() { 
    timeline.step(-1) 
  }
  
  timeline.fastForward = function() {
    timeline.step(timeline.history.length - position - 1)
  }

  timeline.fastBackward = function() {
    timeline.step(-position)
  }

  /////////////////////
  // Route messages. //
  /////////////////////

  var lostMessageCounts = {}

  logClient.$on('main.logClient', function(evt, records) {

    var missingScripts = {} // Scripts whose contents haven't been received.

    records.forEach(function(record) {
      handlers[record.type](record, missingScripts)
    })
    
    // If we are receiving logs for scripts we haven't received yet,
    // let's request them now.  Let's run the request here to coalesce the 
    // messages and cause less traffic between the timeline and logClient.
    logClient.requestScripts(Object.keys(missingScripts))
  })
  
  ///////////////////////////
  // Handle announcements. //
  ///////////////////////////
  
  handlers.announcement = function(record) {

    timeline.scriptContents[record.script] = record.body
        
    programState.scripts[record.script] = { body: record.body, logs: {} }
    
    // Find the last place in the timeline where the script appeared.
    var lastIndex = _(timeline.history).
      pluck('script').
      lastIndexOf(record.script)

    if(lastIndex < 0)
      return

    // Move to after this location in history.
    if(!playing && position <= lastIndex) {
      console.log('moving position to ', lastIndex + 1, 'from', position)
      timeline.setPosition(lastIndex + 1)
    }

    console.log('splicing history', timeline.history, position)

    // Finally remove references to this script from history.
    timeline.history.splice(0, lastIndex + 1)
    position -= lastIndex

    console.log('spliced history', timeline.history, position)
  }
  
  //////////////////
  // Handle logs. //
  //////////////////
  
  handlers.log = function(record, missingScripts) {

    // If we don't have the script associated with the log,
    // we can't really do anything.  We just note that the
    // script is missing and return.
    if(!timeline.scriptContents[record.script]) {
      missingScripts[record.script] = null
      return
    }
    
    // We need to drop messages if we're paused and if adding the
    // message would exceed the maximum history capacity.
    // Otherwise, information that's important to the user could
    // be pushed out of the timeline.
    if(!playing && timeline.history.length >= settings.maxHistoryLength - 1) {
      lostMessageCounts[record.script] = lostMessageCounts[record.script] || 0
      lostMessageCounts[record.script]++
      return
    }

    // Track message loss.
    record.lostMessageCounts = lostMessageCounts
    lostMessageCounts = {}
    
    // Add the record to the history.
    timeline.history.push(record)

    if(playing) {

      timeline.setPosition(getEndPosition())

      programState.forward(record)

      // Max sure history doesn't overflow its capacity.
      if(timeline.history.length >= settings.maxHistoryLength)
        timeline.history.shift()
    }
  }
  
  return timeline

}])