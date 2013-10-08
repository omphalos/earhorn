(function(context) {
  
  /////////////////
  // earhorn$ //
  /////////////////
  
  function earhorn$(scope, name, fn) {
  
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
      // TODO ForInSTatement
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
      'CallExpression'
    ]
    
    // Wrap Identifiers with calls to our logger, eh$(...)
    var instrumentedCode = falafel(body, { loc: true, raw: true }, function(node) {
     
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
          
        console.log(node.loc)
        node.update('eh$("' +
          name + '",\'' +
          JSON.stringify(node.loc) + '\',' +
          node.source() +
        ')')
      }
    }).toString()
  
    instrumentedCode += '//@ sourceURL=' + name
    
console.log(instrumentedCode)
  
    return new Function(instrumentedCode).apply(scope)
  }
  
  earhorn$.maxElements = 3
  earhorn$.maxKeys = 200
  earhorn$.depth = 2
  earhorn$.maxStringLength = 50
  
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
  
  // Log and return the value.
  function eh$(script, loc, val) {
  
    localStorage.setItem('earhorn', JSON.stringify({
      script: script,
      loc: loc,
      val: makeSerializable(val, earhorn$.depth)
    }))
  
    return val
  }
  
  context.earhorn$ = earhorn$
  context.eh$ = eh$

})(this)