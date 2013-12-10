angular.module('main').factory('consoleInterface', ['$interval', function($interval) {

  function expose($scope, pathInScope) {

    // Set up help() command.
    if($scope[pathInScope].help)
      throw 'help already defined'

    $scope[pathInScope].help = function() {
      Object.keys($scope[pathInScope]).forEach(function(key) {
        console.log(key)
      })
    }

    // Expose to the window object.
    Object.keys($scope[pathInScope]).forEach(function(key) {
      if(window.hasOwnProperty(key)) console.warn('Name conflict:', key)
      window[key] = $scope[pathInScope][key]
    })
    
    // User shouldn't have to call digest when working with this interface.
//    $interval(function() {}, 100)
    
    // Attach a clean up event.
    $scope.$on('$destroy', function() {
      Object.keys($scope[pathInScope]).forEach(function(key) {
        delete window[key]
      })
    })
  }

  return { expose: expose  }
}])