angular.module('main').directive('editor', [function() {  

  function link(scope, element, attr) {      
    
    ////////////////////////////////////////////
    // Create the CodeMirror editor instance. //
    ////////////////////////////////////////////

    var initOptions = { value: scope[attr.model] || '' }
    Object.keys(attr).forEach(function(attribute) {
      if(attribute.slice(0, 4) !== 'init') return
      var key = attribute.slice(4)
      initOptions[key] = attr[attribute]
    })
    
    var editor = scope.editor = CodeMirror(element[0], initOptions)
    
    //////////////////////////////////////
    // Set up two-way binding for code. //
    //////////////////////////////////////
    
    var lastReadValue

    scope.$watch(attr.model, function(newValue, oldValue) {
      if(newValue !== oldValue && newValue !== lastReadValue)
        editor.setValue(newValue || '')
    })
      
    editor.on('change', _.debounce(function() {
      scope.$apply(function() {
        lastReadValue = scope[attr.model] = editor.getValue()
      })
    }, 100))
  }

  return { restrict: 'E', link: link }
}])
