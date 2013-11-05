angular.module('main').directive('editor', [
  'consoleInterface',
  '$parse', function(
  consoleInterface,
  $parse) {  

  function link(scope, element, attr) {      

    ////////////////////////////////////////////
    // Create the CodeMirror editor instance. //
    ////////////////////////////////////////////

    var initOptions = { value: scope[attr.code] || '' }
    Object.keys(attr).forEach(function(attribute) {
      if(attribute.slice(0, 4) !== 'init') return
      var key = attribute[4].toLowerCase() + attribute.slice(5)
      initOptions[key] = attr[attribute]
    })
    
    var editor = CodeMirror(element[0], initOptions)
    
    if(attr.hasOwnProperty('element'))
      $parse(attr.element).assign(scope, editor)
        
    //////////////////////////////////////
    // Set up two-way binding for code. //
    //////////////////////////////////////
    
    var lastReadCodeValue

    scope.$watch(attr.code, function(newValue, oldValue) {
      if(newValue !== oldValue && newValue !== lastReadCodeValue)
        editor.setValue(newValue || '')
    })
      
    editor.on('change', _.debounce(function() {
      scope.$apply(function() {
        lastReadCodeValue = scope[attr.code] = editor.getValue()
      })
    }, 100))
    
    ////////////////////////////////////////
    // Set up two-way binding for cursor. //
    ////////////////////////////////////////

    scope.$watch(attr.line, function(newValue, oldValue) {
      //console.log('line', newValue)
      if(newValue === oldValue) return
      editor.setCursor({
        line: scope.$eval(attr.line) || 0,
        ch: editor.getCursor().ch 
      })
    })
      
    scope.$watch(attr.ch, function(newValue, oldValue) {
      //console.log('ch', newValue)
      if(newValue === oldValue) return
      editor.setCursor({
        line: editor.getCursor().line,
        ch: scope.$eval(attr.ch) || 0
      })
    })
      
    editor.on('cursorActivity', _.debounce(function() {
      //console.log('on cursor activity')
      var cursor = editor.getCursor()
      scope.$apply(function() {
        scope[attr.line] = cursor.line
        scope[attr.ch] = cursor.ch
      })
    }, 100))
  }

  return { restrict: 'E', link: link, transclude: true }
}])
