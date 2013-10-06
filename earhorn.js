(function(context) {
  
  /////////////////
  // earhorn$ //
  /////////////////
  
  function earhorn$(name, fn) {
  
    // Name is optional.
    if(arguments.length < 2) {
      fn = name
      name = Math.random().toString()
    }
  
    // Get the function body.
    var fnStr = fn.toString()
  
    var body = fnStr.substring(
      fnStr.indexOf('{') + 1,
      fnStr.lastIndexOf('}'))
      
    while(body[0] === '\n') body = body.slice(1)
  
    localStorage.setItem('earhorn', JSON.stringify({
      script: name,
      body: body
    }))
  
    function isExpression(type) {
      return type.indexOf('Expression', type.length - 'Expression'.length) >= 0
    }
    
    // Wrap Identifiers with calls to our logger, eh$(...)
    var instrumentedCode = falafel(body, { loc: true, raw: true }, function(node) {
      
      if(
        node.type === 'Identifier' &&
        node.parent &&
        node.parent.type &&
        node.parent.type !== 'NewExpression' &&
        node.parent.type !== 'UpdateExpression' &&
        node.parent.type !== 'FunctionExpression' &&
        node.parent.type !== 'MemberExpression' &&
        (node.parent.type !== 'CallExpression' || node.parent.callee !== node) &&
        (isExpression(node.parent.type) || node.parent.type === 'ExpressionStatement')) {
          
        // console.log(node)
        node.update('eh$("' +
          name + '",' +
          node.loc.end.line + ',' +
          node.loc.end.column + ',' +
          node.source() +
        ')')
      }
    }).toString()
  
    instrumentedCode += '//@ sourceURL=' + name
    
console.log(instrumentedCode)
  
    return new Function(instrumentedCode).apply(this)
  }
  
  earhorn$.maxElements = 3
  earhorn$.maxKeys = 100
  earhorn$.depth = 2
  earhorn$.maxStringLength = 20
  
  function makeSerializable(obj, depth) {
    
    if(obj === null)
      return { type: 'null' }
      
    if(obj === void 0)
      return { type: 'undefined' }
    
    var type = Object.prototype.toString.call(obj)

    if(type === '[object Function]')
      return { type: 'Function' }
      
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
  
  // Log and return the value.
  function eh$(script, line, column, val) {
  
    localStorage.setItem('earhorn', JSON.stringify({
      script: script,
      line: line,
      column: column,
      val: makeSerializable(val, earhorn$.depth)
    }))
  
    return val
  }
  
  context.earhorn$ = earhorn$
  context.eh$ = eh$

})(this)