#!/usr/bin/env node

'use strict'

var http = require('http')
  , querystring = require('querystring')
  , mime = require('mime')
  , fs = require('fs')
  , url = require('url')
  , util = require('util')
  , minimatch = require('minimatch')
  , httpProxy = require('http-proxy')
  , argv = require('optimist').argv

var patternFile = argv.patternFile
  , pattern = argv.pattern
  , port = +argv.port
  , jsDir = argv.jsDir || '.'
  , verbose = argv.verbose || false
  , proxyHost = argv.proxyHost || 'localhost'
  , proxyPort = +argv.proxyPort

var proxy = new httpProxy.RoutingProxy()
  , patterns
  , earhornIndexAliases = [ "/earhorn/", "/earhorn/index.html", "/earhorn" ]
  , indexFilePath = __dirname + '/index.html'

if(!port) throw '--port required'
if(patternFile && pattern) throw '--pattern and --patternFile both specified'
if(patternFile) patterns = fs.readFileSync(patternFile).split('\n')
else if(pattern) patterns = [pattern]
if(!patterns) throw '--pattern or --patternFile required'
if(verbose) console.log(argv)

function handleError(err, res, code) {
  console.error(err)
  res.statusCode = code || 500
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(err))
}

var server = http.createServer(function (req, res) {

  var parsedUrl = url.parse(req.url)
    , query = querystring.parse(parsedUrl.query)
    , pathname = parsedUrl.pathname
    , type = mime.lookup(filePath)
    , isJs = type === 'application/javascript'
    , isEarhornDir = !pathname.indexOf('/earhorn/')
    , isIndex = earhornIndexAliases.indexOf(pathname) >= 0

  var filePath =
    isIndex ? indexFilePath :
    isEarhornDir ? __dirname + '/../' + pathname :
    jsDir + pathname

  var matches = patterns.filter(function(p) {
    return !isJs && minimatch(filePath, p)
  })

  if(verbose) {
    console.log('filePath', filePath)
    console.log('patterns', patterns)
  }

  if(proxyPort && !matches.length && !isIndex && !isEarhornDir) {
    console.log(req.method, req.url, '=>', proxyHost + ':' + proxyPort)
    return proxy.proxyRequest(req, res, { host: proxyHost, port: proxyPort })
  }

  console.log(req.method, req.url, '->', filePath)

  if(pathname.indexOf('..') >= 0)
    return handleError('ellipses in path are invalid', res)

  if(req.method === 'PUT') {

    var writeOk = true
      , stream = fs.createWriteStream(relativePath)
    stream.on('close', function() { if(writeOk) res.end() })
    stream.on('error', function(err) {
      writeOk = false
      writeError(err)
    })

    req.pipe(stream)

  } else if(req.method === 'HEAD' || req.method === 'GET')

    fs.stat(filePath, function(err, stats) { 

      if(err) return handleError(err, res)

      res.setHeader('Last-Modified', stats.mtime)
      res.setHeader("Expires", "Sat, 01 Jan 2000 00:00:00 GMT")
      res.setHeader("Cache-Control",
          "no-store, no-cache, must-revalidate, max-age=0")
      res.setHeader("Cache-Control", "post-check=0, pre-check=0")
      res.setHeader("Pragma", "no-cache")
      res.setHeader('Content-Type', type)

      if(req.method === 'HEAD') {
        res.setHeader('Content-Length', stats.size)
        return res.end()
      }

      fs.readFile(filePath, function(err, data) { 

        if(err) return handleError(err, res)

        if(matches.length && !isIndex && !isEarhornDir)
          data = 'earhorn$("' + req.url + '", function() {' + data + '})()'

        res.setHeader('Content-Length', data.length)
        res.end(data)
      })
    })

  else writeError(req.method, res, 405) // Method not allowed.
})

server.listen(port)

console.log('Earhorn server listening on', port)
