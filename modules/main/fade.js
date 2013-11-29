angular.module('main').directive('fade', [function() {  

  function link(scope, element, attr) {

    element.addClass('fade')
    
    scope.$watch(attr.fade, function(newVal) {

      if(newVal) {

        element.addClass('in')
        element.removeClass('out')
      } else {

        element.addClass('out')
        element.removeClass('in')
      }
    })
  }
  
  return { link: link }
}])
