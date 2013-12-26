 ;(function(context) {

  //////////////
  // earhorn$ //
  //////////////

  // Set up settings object.
  function applyDefaults(target) {

    if(target.instrumentation) return target
      
    target.instrumentation = {
      maxElements: 3,
      maxKeys: 200,
      depth: 2,
      maxStringLength: 50,
      bufferSize: 100,
      flushInterval: 25,
      handleErrors: true,
      logModifiedCode: true,
      quiet: true
    }
    
    localStorage.setItem('earhorn-settings', JSON.stringify(target))
    
    return target
  }

  var settings = applyDefaults(
    JSON.parse(localStorage.getItem('earhorn-settings') || '{}'))

  // Subscribe to localStorage events.
  window.addEventListener('storage', onStorage, false)
  
  function onStorage(evt) {
    
    // console.log('server receieved message', window.location)
    
    if(!evt.newValue)
      return

    if(evt.key === 'earhorn-settings') {
      settings = earhorn$.settings =
        applyDefaults(JSON.parse(evt.newValue || '{}'))
      return
    }

    if(evt.key !== 'earhorn-listener')
      return

    var record = JSON.parse(evt.newValue)

    if(!scripts.hasOwnProperty(record.script)) 
      return

    if(record.type === 'announcement-request')
      announce(record.script)      

    else if(record.type === 'edit') {

      localStorage.setItem('earhorn-script-' + record.script, record.body)
      
      if(record.reload) // TODO: could do hot code-swapping instead ...
        location.reload(true)

    } else if(record.type === 'refresh')
      location.reload(true)
      
    else if(record.type === 'reset') {

      localStorage.removeItem('earhorn-script-' + record.script)
      if(record.reload) // TODO: could do hot code-swapping instead ...
        location.reload(true)
    }
  }

  var scripts = {}

  function announce(name) {
    flush()
    // Announcements are large and rare so it's ok to send as its own message.
    send({
      type: 'announcement',
      script: name,
      modified: scripts[name].modified,
      body: scripts[name].body,
      parseError: scripts[name].parseError
    })
    flush()
  }

  function earhorn$(name, fn) {
  
    // Get the function body.
    var fnKey = 'earhorn-script-' + name
      , fnStr = fn.toString()
      , modified = false

    var body = fnStr.substring(
      fnStr.indexOf('{') + 1,
      fnStr.lastIndexOf('}'))
      
    while(body[0] === '\n') body = body.slice(1)
    
    if(localStorage.hasOwnProperty(fnKey)) {
      
      var storedVersion = localStorage.getItem(fnKey)
      if(storedVersion !== body) {
        modified = true
        body = storedVersion
        if(settings.instrumentation.logModifiedCode)
          console.log('using copy of code in localStorage for', name)
      }
    }
  
    function isExpression(type) {
      return type.indexOf('Expression', type.length - 'Expression'.length) >= 0
    }
    
    var instrumentedExpressions = [
      'NewExpression',
      'CallExpression',
      'AssignmentOperator',
      'ConditionalExpression',
      'LogicalExpression',
      'UpdateExpression',
      'UnaryExpression',
      'PostfixExpression',
      'BinaryExpression',
      'AssignmentExpression'
      // TODO function arguments
      // TODO CatchClause
      // TODO ForStatement
      // TODO ForInStatement
    ]
    
    var instrumentedParentTypes = [
      'ExpressionStatement',
      'SequenceExpression',
      'ReturnStatement',
      'BinaryExpression',
      'ThrowStatement'
    ]
    
    var skippedMemberExpressionParents = [
      'AssignmentExpression',
      'UnaryExpression',
      'UpdateExpression',
      'CallExpression', /*
      'NewExpression' */
    ]
    
    // Wrap Identifiers with calls to our logger, eh$(...)
    
    scripts[name] = {
      body: body,
      modified: modified
    }

    var handleErrors = settings.instrumentation.handleErrors
      , tryPrefix = handleErrors ? 'var eh$log; try {' : ''
      , catchSuffix = handleErrors ?
        '} catch(err) { eh$("' + name +  '",eh$loc,err,true); throw err; }' :
        ''

    var instrumentedCode

    try {
      if(!settings.instrumentation.quiet)
        console.log('parsing', name)
      instrumentedCode = falafel(body, { loc: true, raw: true }, visitNode).toString()
      scripts[name].parseError = null
      announce(name)
    } catch(err) {
      console.error(name, err.toString(), body)
      
      var e = err.toString()
        , colon1 = e.indexOf(': ')
        , colon2 = e.indexOf(': ', colon1 + 1)
        , message = e.substring(colon2 + ': '.length)
      
      scripts[name].parseError = {
        line: err.lineNumber - 1,
        ch: err.column,
        message: message
      }
      announce(name)
      throw err
    }

    function getLocationUpdate(node) {
      return 'eh$loc="' +
        (node.loc.start.line - 1) + ',' +
        node.loc.start.column + ',' +
        (node.loc.end.line - 1) + ',' +
        node.loc.end.column + '"'
    }

    function visitNode(node) {
     
      if(!node.parent) return
      
      if(node.type === 'Literal' && node.parent.type === 'ThrowStatement') {
        node.update(getLocationUpdate(node) + ',' + node.source())
        return
      }
        
      if(node.type === 'Literal')
        return
      
      if(
        node.parent.type === 'BlockStatement' && node.parent.parent && (
        node.parent.parent.type === 'FunctionDeclaration' || 
        node.parent.parent.type === 'FunctionExpression')) {
        
        if(node.parent.body[0] === node) {
          node.update(tryPrefix + node.source())
        }
        
        if(node.parent.body[node.parent.body.length - 1] === node) {
          node.update(node.source() + catchSuffix)
        }
        
        return
      }

      if(
        (node.parent.type === 'CallExpression' && 
          node !== node.parent.callee) ||
        (node.parent.type === 'IfStatement' && 
          node === node.parent.test) ||
        (node.parent.type === 'WhileStatement' && 
          node === node.parent.test) ||
        (node.parent.type === 'DoWhileStatement' && 
          node === node.parent.test) ||
        (node.parent.type === 'SwitchCase' && 
          node === node.parent.test) ||
        (node.parent.type === 'SwitchStatement' && 
          node === node.parent.discriminant) ||
        (node.parent.type === 'MemberExpression' && 
          node === node.parent.object) ||
        instrumentedExpressions.indexOf(node.type) >= 0 ||
        (instrumentedParentTypes.
          indexOf(node.parent.type) >= 0) ||
        (node.type === 'MemberExpression' && 
          skippedMemberExpressionParents.indexOf(node.parent.type) < 0)) {

        var parenStart
          , parenEnd
          
        if(node.parent.type === 'NewExpression') {
          parenStart = '('
          parenEnd = ')'
        } else parenStart = parenEnd = ''
        
        node.update(parenStart + 'eh$("' +
          name + '",' + 
          getLocationUpdate(node) + ',' +
          node.source() +
        ')' + parenEnd)
      }
    }

    instrumentedCode =
      tryPrefix +
      instrumentedCode +
      catchSuffix +
      '//@ sourceURL=' + name // Source mapping.

    if(settings.instrumentation.verbose)
      console.log(instrumentedCode)
  
    try {
      return new Function(instrumentedCode)
    } catch(e) {
      console.error(instrumentedCode)
      return new Function(instrumentedCode)
    }
  }
  
  earhorn$.settings = settings
  
  function makeSerializable(obj, depth) {
    
    if(obj === null)
      return { type: 'null' }
      
    if(obj === void 0)
      return { type: 'undefined' }
    
    var type = Object.prototype.toString.call(obj)

    if(type === '[object Function]')
      return { type: 'Function', name: obj.name }
      
    if(type === '[object Number]')
      return {
        type: 'Number',
        value: isNaN(obj) || !isFinite(obj) ? obj.toString() : obj
      }
    
    if(type === '[object Boolean]')
      return { type: 'Boolean', value: obj }
    
    if(type === '[object String]') {
      return {
        type: 'String',
        clipped: obj.length > settings.instrumentation.maxStringLength,
        value: obj.substring(0, settings.instrumentation.maxStringLength)
      }
    }
    
    if(type === '[object Array]') {

      var elements = depth <= 1 ? [] :
        obj.slice(0, settings.instrumentation.maxElements).map(function(x) {
          return makeSerializable(x, depth - 1)
        })

      return {
        type: 'Array',
        length: obj.length,
        elements: elements
      }
    }

    // Object
    var result = {
      type: 'Object',
      constructor: obj.constructor ? obj.constructor.name : null,
      complete: true,
      properties: { }
    }

    if(obj instanceof Error)
      result.errorMessage = obj.toString()

    if(depth > 1 && obj !== window) {

      var keys = settings.instrumentation.maxKeys

      for(var key in obj) {

        if(keys --> 0) {
          try {
            var value = obj[key]
            result.properties[key] = makeSerializable(obj[key], depth - 1)
          } catch(err) {
            result.properties[key] = makeSerializable(err, depth - 1)
          }
        } else {
          result.complete = false
          break
        }
      }
    }
      
    return result
  }
  
  var buffer = []
  
  // Log and return the value.
  function eh$(script, loc, val, caught) {
  
    send({
      type: 'log',
      script: script,
      loc: loc,
      val: makeSerializable(val, settings.instrumentation.depth),
      caught: caught || false
    })

    return val
  }
  
  // Setting an initial event seems to be necessary in some cases
  // to get the localStorage event to fire correctly for subsequent events
  // in listening windows.
  localStorage.setItem('earhorn-log', '[]')
  
  function send(message) {

    buffer.push(message)
    
    if(buffer.length > settings.instrumentation.bufferSize)
      flush()
  }
  
  function flush() {
    if(!buffer.length) return

    localStorage.setItem('earhorn-log', JSON.stringify(buffer))
    buffer = []
  }
  
  function checkBuffer() {
    flush()    
    setTimeout(checkBuffer, settings.instrumentation.flushInterval)
  }
  
  setTimeout(checkBuffer, settings.instrumentation.flushInterval)
  
  context.earhorn$ = earhorn$
  context.eh$ = eh$

})(this);