(function(context) {

  //////////////
  // earhorn$ //
  //////////////

  // Subscribe to localStorage events.
  if(window.addEventListener) window.addEventListener('storage', onStorage, false)
  else if(window.attachEvent) window.attachEvent('onstorage', onStorage)
  
  function onStorage(evt) {
    
    console.log('server receieved message')

    if(evt.key !== 'earhorn-listener')
      return

    var record = JSON.parse(evt.newValue)

    if(!scripts.hasOwnProperty(record.script)) 
      return

    if(record.type === 'announcement-request')
      announce(record.script)      

    else if(record.type === 'edit') {

      localStorage.setItem('earhorn-script-' + record.script, record.body)
      console.log('applying edit', record.script, record.body)
      if(record.reload) // TODO: could do hot code-swapping instead ...
        location.reload(true)

    } else if(record.type === 'reset') {

      localStorage.removeItem('earhorn-script-' + record.script)
      if(record.reload) // TODO: could do hot code-swapping instead ...
        location.reload(true)
    }
  }

  var scripts = {}

  function announce(name) {
    send({
      type: 'announcement',
      script: name,
      modified: scripts[name].modified,
      body: scripts[name].body,
      parseError: scripts[name].parseError
    })
  }

  function earhorn$(scope, name, fn) {
  
    // Get the function body.
    var sessionFnKey = 'earhorn-script-' + name
      , modified = localStorage.hasOwnProperty(sessionFnKey)
      , fnStr = fn.toString()
      
    var body
    
    if(modified) {
      
      body = localStorage.getItem(sessionFnKey)
      console.log('using copy of code in localStorage for', name)
    } else {
      
      body = fnStr.substring(
      fnStr.indexOf('{') + 1,
      fnStr.lastIndexOf('}'))
      
      while(body[0] === '\n') body = body.slice(1)
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
      'BinaryExpression'
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
      'CallExpression',
      'NewExpression'
    ]
    
    // Wrap Identifiers with calls to our logger, eh$(...)
    
    scripts[name] = {
      body: body,
      modified: modified
    }
    
    var instrumentedCode
    try {
      instrumentedCode = falafel(body, { loc: true, raw: true }, visitNode).toString()
      scripts[name].parseError = null
      announce(name)
    } catch(err) {
      console.error(err, body)
      scripts[name].parseError = {
        line: err.lineNumber - 1,
        ch: err.column,
        message: err.toString()
      }
      announce(name)
      throw err
    }
      
    function visitNode(node) {
     
      if(!node.parent || node.type === 'Literal') return
       
      if(
        (node.parent.type === 'CallExpression' && node !== node.parent.callee) ||
        (node.parent.type === 'IfStatement' && node === node.parent.test) ||
        (node.parent.type === 'WhileStatement' && node === node.parent.test) ||
        (node.parent.type === 'DoWhileStatement' && node === node.parent.test) ||
        (node.parent.type === 'SwitchCase' && node === node.parent.test) ||
        (node.parent.type === 'SwitchStatement' && node === node.parent.discriminant) ||
        instrumentedExpressions.indexOf(node.type) >= 0 ||
        (node.type !== 'MemberExpression' &&
          instrumentedParentTypes.indexOf(node.parent.type) >= 0) ||
        (node.type === 'MemberExpression' && 
          skippedMemberExpressionParents.indexOf(node.parent.type) < 0)) {
          
        node.update('eh$("' +
          name + '","' +
          (node.loc.start.line - 1) + ',' +
          node.loc.start.column + ',' +
          (node.loc.end.line - 1) + ',' +
          node.loc.end.column + '",' +
          node.source() +
        ')')
      }
    }
  
    instrumentedCode += '//@ sourceURL=' + name
    
    try {
      return new Function(instrumentedCode).apply(scope)
    } catch(e) {
      console.error(instrumentedCode)
      return new Function(instrumentedCode).apply(scope)
    }
  }
  
  earhorn$.maxElements = 3
  earhorn$.maxKeys = 200
  earhorn$.depth = 2
  earhorn$.maxStringLength = 50
  earhorn$.bufferSize = 100
  earhorn$.flushInterval = 100
  
  function makeSerializable(obj, depth) {
    
    if(obj === null)
      return { type: 'null' }
      
    if(obj === void 0)
      return { type: 'undefined' }
    
    var type = Object.prototype.toString.call(obj)

    if(type === '[object Function]')
      return { type: 'Function', name: obj.name }
      
    if(type === '[object Number]')
      return { type: 'Number', value: obj }
    
    if(type === '[object Boolean]')
      return { type: 'Boolean', value: obj }
    
    if(type === '[object String]') {
      return {
        type: 'String',
        clipped: obj.length > earhorn$.maxStringLength,
        value: obj.substring(0, earhorn$.maxStringLength)
      }
    }
    
    if(type === '[object Array]') {

      var elements = depth <= 1 ? [] :
        obj.slice(0, earhorn$.maxElements).map(function(x) {
          return makeSerializable(x, depth - 1)
        })

      return {
        type: 'Array',
        length: obj.length,
        elements: elements
      }
    }

    // Object
    var keys = earhorn$.maxKeys

    var result = {
      type: 'Object',
      constructor: obj.constructor ? obj.constructor.name : null,
      complete: true,
      properties: { }
    }

    if(depth > 1)
      for(var key in obj)
        if(keys --> 0)
          result.properties[key] = makeSerializable(obj[key], depth - 1)
        else {
          result.complete = false
          break
        }
      
    return result
  }
  
  var buffer = []
  
  // Log and return the value.
  function eh$(script, loc, val) {
  
    send({
      type: 'log',
      script: script,
      loc: loc,
      val: makeSerializable(val, earhorn$.depth)
    })

    return val
  }
  
  // Setting an initial event seems to be necessary in some cases
  // to get the localStorage event to fire correctly for subsequent events
  // in listening windows.
  localStorage.setItem('earhorn-log', '[]')
  
  function send(message) {

    buffer.push(message)
    
    if(buffer.length > earhorn$.bufferSize)
      flush()
  }
  
  function flush() {
    if(!buffer.length) return

    localStorage.setItem('earhorn-log', JSON.stringify(buffer))
    buffer = []
  }
  
  function checkBuffer() {
    flush()    
    setTimeout(checkBuffer, earhorn$.flushInterval)
  }
  
  setTimeout(checkBuffer, earhorn$.flushInterval)
  
  context.earhorn$ = earhorn$
  context.eh$ = eh$

})(this)