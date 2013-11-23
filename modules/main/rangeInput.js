angular.module('main').directive('rangeInput', [
  '$parse', function(
  $parse) {  

  'use strict'

  function link(scope, element, attr) {
    
    // ngModel on input[type=range] doesn't work because
    // max can change at the same time as model,
    // but it appears that angular updates the DOM in the wrong order.

    function updateElement() {
      element.attr('min', scope.$eval(attr.rangeMin))
      element.attr('max', scope.$eval(attr.rangeMax))
      element.val(scope.$eval(attr.rangeInput))
    }

    scope.$watch(attr.rangeMin, updateElement)
    scope.$watch(attr.rangeMax, updateElement)
    scope.$watch(attr.rangeInput, updateElement)
    
    element.change(function() {
      $parse(attr.rangeInput).assign(scope, +element.val())
      if(!scope.$$phase) scope.$digest()
    })
  }
  
  return { link: link }
}])
