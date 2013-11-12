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

  timeline.scriptContents = {}
  timeline.history = []
  timeline.position = -1
  timeline.programState = programStateFactory.create()
  
  ///////////////////////
  // Player interface. //
  ///////////////////////
  
  function getEndPosition() {
    return Math.max(timeline.history.length - 1, 0)
  }

  function movePositionForward(newVal, oldVal) {
    for(var i = oldVal + 1; i <= newVal; i++)
      programState.forward(timeline.history[i])
  }
  
  function movePositionBackward(newVal, oldVal) {

    for(var i = oldVal; i > newVal; i--)
      programState.reverse(timeline.history[i])
  }

  timeline.$watch('position', function(newVal, oldVal) {

    if(newVal === oldVal) return

    movePositionForward(newVal, oldVal)
    
    movePositionBackward(newVal, oldVal)
    
    if(newVal !== getEndPosition())
      timeline.pause()
  })
  
  timeline.isPlaying = function() {
    return playing
  }

  timeline.play = function() {
    timeline.position = getEndPosition()
    playing = true
  }

  timeline.pause = function() {
    playing = false
  }
  
  timeline.step = function(stepSize) {
    timeline.pause()
    var candidate = timeline.position + stepSize
    if(candidate < 0 || candidate >= timeline.history.length) return
    timeline.position = candidate
  }
  
  timeline.stepForward = function() { 
    timeline.step(1) 
  } 
  
  timeline.stepBackward = function() { 
    timeline.step(-1) 
  }
  
  timeline.fastForward = function() {
    timeline.step(timeline.history.length - timeline.position - 1)
  }

  timeline.fastBackward = function() {
    timeline.step(-timeline.position)
  }

  /////////////////////
  // Route messages. //
  /////////////////////

  var pendingAnnouncements = {}
    , lostMessageCounts = {}

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
    pendingAnnouncements[record.script] = record.body
    timeline.scriptContents[record.script] = record.body
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

    // Add any pending announcements to this record, publishing them together.
    record.announcements = pendingAnnouncements
    pendingAnnouncements = {}
    
    record.lostMessageCounts = lostMessageCounts
    lostMessageCounts = {}
    
    // Add the record to the history.
    timeline.history.push(record)

    if(playing) {

      timeline.position = getEndPosition()

      // Max sure history doesn't overflow its capacity.
      if(timeline.history.length >= settings.maxHistoryLength)
        timeline.history.shift()
    }
  }
  
  return timeline

}])