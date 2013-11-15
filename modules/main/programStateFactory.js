angular.module('main').factory('programStateFactory', [
  function() {

  'use strict'
  
  function ProgramState() {
    this.scripts = {}
  }
  
  ProgramState.prototype.forward = function(record) {

    var self = this
    
    if(!record)
      throw 'invalid record'

    if(!record.reverse) {
      
      var reverse = record.reverse = {
        currentLoc: self.currentLoc,
        currentScript: self.currentScript,
        script: record.script,
        loc: record.loc,
        scriptBodies: {},
        scriptStates: {}
      }

      // Get the previous script bodies.
      /*Object.keys(record.announcements).forEach(function(key) {
      
        reverse.scriptBodies[key] = 
          self.scripts[key] ? self.scripts[key].body : null
      
        reverse.scriptStates[key] =
          self.scripts[key] ? self.scripts[key].log : null
      })*/
      
      // Take script snapshots.
      /* Object.keys(record.lostMessageCounts).forEach(function(key) {
        reverse.scriptStates[key] = 
          self.scripts[key] ? self.scripts[key].log : null
      }) */
      
      // Get the previous value.
      reverse.val =
        self.scripts[record.script] &&
        self.scripts[record.script].logs[record.loc] &&
        self.scripts[record.script].logs[record.loc].val
    }
    
    if(!record.forward) {
      
      var forward = record.forward = {
        loc: record.loc,
        val: record.val,
        currentLoc: record.loc,
        currentScript: record.script,
        script: record.script,
        scriptBodies: {},
        scriptStates: {}
      }
      
      /*if(record.announcements) {
        
        Object.keys(record.announcements).forEach(function(key) {
          forward.scriptBodies[key] = record.announcements[key]
          forward.scriptStates[key] = {}
        })
      }*/
      
      /* if(record.lostMessageCounts) {
        Object.keys(record.lostMessageCounts).forEach(function(key) {
          forward.scriptStates[key] = {}
        })
      } */
    }
    
    this.applyChange(record.forward)
  }
  
  ProgramState.prototype.applyChange = function(change) {
    
    var self = this
    
    Object.keys(change.scriptBodies).forEach(function(key) {
      var script = self.scripts[key] = self.scripts[key] || { logs: {} }
      script.body = change.scriptBodies[key]
    })
    
    Object.keys(change.scriptStates).forEach(function(key) {
      console.log('applying script state', key, change.scriptStates[key])
      var script = self.scripts[key] = self.scripts[key] || { logs: {} }
      script.logs = change.scriptStates[key]
    })
    
    var changingScript = this.scripts[change.script]
    this.currentScript = change.currentScript
    this.currentLoc = change.currentLoc

    if(!changingScript)
      return console.log('no changing script')
    
    if(change.val) {

      var changingLog = changingScript[change.loc]

      if(!changingLog) {

        // Add
        var split = change.loc.split(',')
          , from = { line: +split[0], column: +split[1] }
          , to = { line: +split[2], column: +split[3]}
          , parsed = { from: from, to: to }
          
        changingLog = changingScript.logs[change.loc] = { loc: parsed }
      }

      changingLog.val = change.val

    } else {
      
      // Delete log
      delete changingScript.logs[change.loc]
    }
  }
  
  ProgramState.prototype.reverse = function(record) {
    this.applyChange(record.reverse)
  }
  
  return {
    create: function() { return new ProgramState() }
  }  

}])