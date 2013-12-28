angular.module('main').factory('consoleInterface', [
  'settingsService', function(
  settingsService) {

  function expose($scope, pathInScope) {

    var settings = settingsService.load({
      console: { digestInterval: 250 }
    })

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
    function conditionallyDigest() {
      
      if(settings.console.digestInterval && !$scope.$$phase)
        $scope.$digest()
        
      timeoutToken = setTimeout(
        conditionallyDigest,
        settings.console.digestInterval || 1000)
    }
    
    var timeoutToken = setTimeout(
      conditionallyDigest, 
      settings.console.digestInterval || 1000)
    
    // Attach a clean up event.
    $scope.$on('$destroy', function() {
      
      clearTimeout(timeoutToken)
      
      Object.keys($scope[pathInScope]).forEach(function(key) {
        delete window[key]
      })
    })
  }

  return { expose: expose  }
}])