(function(context) {
  
  /////////////////
  // earhorn$ //
  /////////////////

  // Subscribe to localStorage events.
  if(window.addEventListener) window.addEventListener('storage', onStorage, false)
  else if(window.attachEvent) window.attachEvent('onstorage', onStorage)
  
  function onStorage(evt) {

    if(evt.key !== 'earhorn-view') return

    var record = JSON.parse(evt.newValue)

    if(record.type === 'echo') {

      var scriptName = evt.script
      if(!scripts[scriptName]) return
      
      announce(scriptName)      

    } else if(record.type === 'edit' && scripts[record.script]) {

      if(scripts[record.script]) {
        sessionStorage.setItem('earhorn-' + record.script, record.body)
        if(record.reload) // TODO: could do hot code-swapping instead ...
          location.reload(true)
      }
    }
  }

  var scripts = {}

  function announce(name) {

    var body = scripts[name]

    localStorage.setItem('earhorn-log', JSON.stringify({
      type: 'announcement',
      script: name,
      body: body
    }))
  }

  function earhorn$(scope, name, fn) {
  
    // Get the function body.
    var sessionFn = sessionStorage.getItem('earhorn-' + name)
      , fnStr = fn.toString()
      
    if(sessionFn) console.log('using copy of code in session storage for', name)
  
    var body = sessionFn
    
    if(!body) {
      
      body = fnStr.substring(
      fnStr.indexOf('{') + 1,
      fnStr.lastIndexOf('}'))
      
      while(body[0] === '\n') body = body.slice(1)
    }
  
    scripts[name] = body
    announce(name)
  
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
    
    var instrumentedCode
    try {
      instrumentedCode = falafel(body, { loc: true, raw: true }, visitNode).toString()
    } catch(err) {
      console.error(err, body)
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
          node.loc.start.line + ',' +
          node.loc.start.column + ',' +
          node.loc.end.line + ',' +
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
  
    buffer.push({
      script: script,
      loc: loc,
      val: makeSerializable(val, earhorn$.depth)
    })
    
    if(buffer.length > earhorn$.bufferSize)
      flush()
 
    return val
  }
  
  function flush() {
    localStorage.setItem('earhorn-log', JSON.stringify({
      type: 'log',
      buffer: buffer
    }))
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