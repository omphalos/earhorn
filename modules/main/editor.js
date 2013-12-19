angular.module('main').directive('editor', [
  'consoleInterface',
  '$parse', 
  '$templateCache', 
  '$compile', 
  '$interval', function(
  consoleInterface,
  $parse,
  $templateCache,
  $compile,
  $interval) {  

  function link(scope, element, attr) {      

    ////////////////////////////////////////////
    // Create the CodeMirror editor instance. //
    ////////////////////////////////////////////

    var initOptions = { value: scope.$eval(attr.code) || '' }
    Object.keys(attr).forEach(function(attribute) {
      if(attribute.slice(0, 4) !== 'init') return
      var key = attribute[4].toLowerCase() + attribute.slice(5)
      initOptions[key] = attr[attribute]
    })
    
    var editor = CodeMirror(element[0], initOptions)
    
    if(attr.hasOwnProperty('element'))
      $parse(attr.element).assign(scope, editor)

    var pending = {}
      , template = $compile($templateCache.get(attr.widgetTemplate))
      , widgetElement = template(scope)[0]
      , widgetObj
      , markers = {}
      , lineWidgets = {}     
      , bookmarks = {}

    var rebuildEditor = function() {
      
      // Focus.
      if(pending.focus) {
        var focus = scope.$eval(attr.focus)
        if(focus) editor.focus()
      }
      
      // Code.
      if(pending.code) {
        var code = scope.$eval(attr.code) || ''
        if(code !== editor.getValue())
          editor.setValue(code)        
      }
      
      // Cursor.
      var oldCursor = editor.getCursor()
        , line = pending.line ? scope.$eval(attr.line) : oldCursor.line
        , ch = pending.ch ? scope.$eval(attr.ch) : oldCursor.ch
        
      if(line !== oldCursor.line || ch !== oldCursor.ch) {
        editor.scrollTo(0)
        editor.setCursor({ line: line, ch: ch })
      }
      
      // Widget.
      if(pending.widget) {
  
        if(widgetObj) widgetObj.clear() // TODO check this

        var line = scope.$eval(attr.widgetLine) || 0
          , ch = scope.$eval(attr.widgetCh) || 0
          , pos = { line: line, ch: ch }

        widgetObj = editor.addWidget(pos, widgetElement)
      }
      
      // Markers.
      if(pending.markers) {
      
        var newMarkers = scope.$eval(attr.markers) || {}
        
        Object.keys(markers).forEach(function(key) {

          if(newMarkers.hasOwnProperty(key)) return
          
          // Delete marker.
          markers[key].clear()
          delete markers[key]          
        })
        
        Object.keys(newMarkers).forEach(function(key) {
          
          if(markers.hasOwnProperty(key)) return
          
          // Add marker.
          var marker = newMarkers[key]
          markers[key] = editor.markText(
            marker.from, 
            marker.to, 
            marker.options) 
        })
      }
      
      // Line widgets.
      if(pending.lineWidgets) {

        var newLineWidgets = scope.$eval(attr.lineWidgets) || {}
        
        Object.keys(lineWidgets).forEach(function(key) {

          if(newLineWidgets.hasOwnProperty(key)) return
          
          // Delete line widget.
          lineWidgets[key].widget.clear()
          lineWidgets[key].scope.$destroy()
          delete lineWidgets[key]          
        })
        
        Object.keys(newLineWidgets).forEach(function(key) {
          
          if(lineWidgets.hasOwnProperty(key)) return
          
          // Add line widget.
          var lineWidget = newLineWidgets[key]
            , template = $compile($templateCache.get(lineWidget.template))
            , lineWidgetScope = scope.$new()
            
          lineWidgetScope.model = lineWidget.model
            
          lineWidgets[key] = {
            scope: lineWidgetScope,
            widget: editor.addLineWidget(
              lineWidget.line,
              template(lineWidgetScope)[0],
              lineWidget.options)
          }
        })
      }
      
      // Bookmarks.
      if(pending.bookmarks) {
        
        var newBookmarks = scope.$eval(attr.bookmarks) || {}

        Object.keys(bookmarks).forEach(function(key) {

          if(newBookmarks.hasOwnProperty(key)) return
          
          // Delete bookmark.
          bookmarks[key].destroy()
        })
        
        Object.keys(newBookmarks).forEach(function(key) {

          if(bookmarks.hasOwnProperty(key)) {
            // Update
            bookmarks[key].scope.log = newBookmarks[key]
            
          } else {
            // Add widget.
            var bookmarkScope = scope.$new()
              , log = newBookmarks[key]
              , pos = { line: log.loc.to.line, ch: log.loc.to.column }
              , template = $compile($templateCache.get(attr.bookmarkTemplate))
              , widget = template(bookmarkScope)[0]
              , options = angular.extend({ widget: widget, insertLeft: 1 }, log)
  
            bookmarkScope.model = log
            bookmarkScope.key = key
  
            bookmarks[key] = {
              scope: bookmarkScope,
              bookmark: editor.setBookmark(pos, options),
              widget: widget,
              destroy: function() {
                this.bookmark.clear() // TODO rename bookmark to textMarker (?)
                this.scope.$destroy()
                delete bookmarks[key]
              }
            }
          }
        })
      }
      
      pending = {}
    }

    var rebuildEditorOperator = function() {
      editor.operation(rebuildEditor)
    }    
    var rebuildEditorDebounced = _.debounce(rebuildEditor, 100)

    function watch(prop, uiComponent, fullWatch) {
      scope.$watch(prop, function(newValue, oldValue) {
        if(newValue === oldValue) return
        pending[uiComponent] = true
        rebuildEditorDebounced()
      }, fullWatch)
    } 
    
    // Bind focus.     
    if(attr.focus) {

      // TODO: make this an event instead
      editor.on('focus', function() {
        $parse(attr.focus).assign(scope, true)
        if(!scope.$$phase) scope.$digest()
      })
      
      editor.on('blur', function() {
        $parse(attr.focus).assign(scope, false)
        if(!scope.$$phase) scope.$digest()
      })
      
      watch(attr.focus, 'focus')
    }
    
    // Bind code.        
    if(attr.code) {

      editor.on('change', function() {
        scope[attr.code] = editor.getValue()
        if(!scope.$$phase) scope.$digest()
      })

      watch(attr.code, 'code')  
    }
    
    // Bind cursor.
    editor.on('cursorActivity', function() {
      var cursor = editor.getCursor()
      if(attr.line)
        $parse(attr.line).assign(scope, cursor.line)
      if(attr.ch)
        $parse(attr.ch).assign(scope, cursor.ch)
      if(!scope.$$phase) scope.$digest()
    })
    
    if(attr.line) watch(attr.line, 'line')
    if(attr.ch) watch(attr.ch, 'ch')

    // Bind widget.
    if(attr.widgetTemplate) {
      watch(attr.widgetLine, 'widget')
      watch(attr.widgetCh, 'widget')
    }

    // Bind markers.
    if(attr.markers)
      watch(attr.markers, 'markers', true)

    // Bind line widgets.    
    if(attr.lineWidgets)
      watch(attr.lineWidgets, 'lineWidgets', true)
      
    // Bind bookmarks.
    if(attr.bookmarks)
      watch(attr.bookmarks, 'bookmarks', true)
  }
  
  return { restrict: 'E', link: link }
}])
