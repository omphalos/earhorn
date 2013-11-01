angular.module('main').factory('programStateFactory', [function() {

  'use strict'
  
  function ProgramState() {
    this.scripts = {}
  }
    
  // Take a log object from the logClient and create a forwardable/reversible delta
  ProgramState.prototype.createDelta = function(log) {
    console.log(log)
    var delta = {
      forward: {},
      backward: {}
    }

    // Traverse code changes from announcements
    // Traverse code changes from pause points
    // Traverse var state change
  }
  
  ProgramState.prototype.stepForward = function(delta) {
    
  }
  
  ProgramState.prototype.stepBackward = function(delta) {
    
  }
  
  return {
    create: function() { return new ProgramState() }
  }  

}])