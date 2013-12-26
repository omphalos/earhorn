importScripts('../../components/esprima/esprima.js')

var pending = []

setInterval(function() {
  
  if(!pending.length) return
  
  var latest = pending.pop()

  try {
    
    postMessage({
      id: latest.id,
      result: esprima.parse(latest.code),
      type: 'ast'
    })

  } catch(err) {

    var message = err.toString()
    message = message.substring(message.indexOf(': ') + 2)
    message = message.substring(message.indexOf(': ') + 2)
              
    postMessage({
      id: latest.id,
      line: err.lineNumber - 1,
      ch: err.column - 1,
      message: message,
      type: 'error'
    })
  }

  pending.length = 0
  
}, 100)

addEventListener('message', function onmessage(evt) {
  pending.push(evt.data)
})
