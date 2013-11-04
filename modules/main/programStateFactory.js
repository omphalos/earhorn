angular.module('main').factory('programStateFactory', [function() {

  'use strict'
  
  function ProgramState() {
    this.scripts = {}
  }
  
  ProgramState.prototype.forward = function(record) {

    var self = this

    if(!record.reverse) {
      
      var reverse = record.reverse = {
        loc: record.loc,
        script: record.script,
        scriptBodies: {},
        scriptStates: {}
      }

      // Get the previous script bodies.
      Object.keys(record.announcements).forEach(function(key) {
      
        reverse.scriptBodies[key] = 
          self.scripts[key] ? self.scripts[key].body : null
      
        reverse.scriptStates[key] =
          self.scripts[key] ? self.scripts[key].log : null
      })
      
      // Take script snapshots.
      Object.keys(record.lostMessageCounts).forEach(function(key) {
        reverse.scriptStates[key] = 
          self.scripts[key] ? self.scripts[key].log : null
      })
      
      // Get the previous value.
      reverse.val = self.scripts[record.script] ?
        self.scripts[record.script][record.loc] : null
        
      // Get the previous 'current' value
      reverse.currentScript = self.currentScript
      reverse.currentLoc = self.currentLoc
    }
    
    if(!record.forward) {
      
      var forward = record.forward = {
        loc: record.loc,
        script: record.script,
        scriptBodies: {},
        scriptStates: {}
      }
      
      if(record.announcements) {
        
        Object.keys(record.announcements).forEach(function(key) {
          forward.scriptBodies[key] = record.announcements[key]
          forward.scriptStates[key] = {}
        })
      }
      
      if(record.lostMessageCounts) {
        Object.keys(record.lostMessageCounts).forEach(function(key) {
          forward.scriptStates[key] = {}
        })
      }
      
      forward.val = record.val
      
      // Get the next 'current' value
      forward.currentScript = record.script
      forward.currentLoc = record.loc
    }
    
    this.applyChange(record.forward)
  }
  
  ProgramState.prototype.applyChange = function(change) {
    
    var self = this
    
    Object.keys(change.scriptBodies).forEach(function(key) {
      self.scripts[key] = self.scripts[key] || { logs: {} }
      self.scripts[key].body = change.scriptBodies[key]
    })
    
    Object.keys(change.scriptStates).forEach(function(key) {
      self.scripts[key] = self.scripts[key] || { logs: {} }
      self.scripts[key].logs = change.scriptStates[key]
    })
    
    if(!this.scripts[change.script]) throw 'missing script ' + change.script
    this.scripts[change.script].logs[change.loc] = change.val
    this.currentScript = change.currentScript
    this.currentLoc = change.currentLoc
  }
  
  ProgramState.prototype.reverse = function(record) {
    this.applyChange(record.reverse)
  }
  
  return {
    create: function() { return new ProgramState() }
  }  

}])