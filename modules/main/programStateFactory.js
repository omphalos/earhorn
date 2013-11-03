angular.module('main').factory('programStateFactory', [function() {

  'use strict'
  
  function ProgramState() {
    this.scripts = {}
  }
    
  // Take a log object from the logClient and create a forwardable/reversible delta
  ProgramState.prototype.getDelta = function(log) {

    // Traverse code changes from announcements
    // Traverse code changes from pause points
    // Traverse var state change
  }
  
  ProgramState.prototype.forward = function(delta) {
    
  }
  
  ProgramState.prototype.reverse = function(delta) {
    
  }
  
  return {
    create: function() { return new ProgramState() }
  }  

}])