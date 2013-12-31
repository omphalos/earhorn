#!/usr/bin/env node

/*
 * cd ..
 * ./earhorn/server/server.js
 *    --jsDir .
 *    --pattern "MINIMATCH PATTERN HERE"
 *    --port 8001
 *    --proxyPort 8000
 */

'use strict'

var http = require('http')
  , querystring = require('querystring')
  , mime = require('mime')
  , fs = require('fs')
  , url = require('url')
  , util = require('util')
  , minimatch = require('minimatch')
  , httpProxy = require('http-proxy')
  , proxy = new httpProxy.RoutingProxy()
  , argv = require('optimist').argv
  , patternFile = argv.patternFile
  , pattern = argv.pattern
  , port = +argv.port
  , jsDir = argv.jsDir || '.'
  , verbose = argv.verbose || false
  , proxyHost = argv.proxyHost || 'localhost'
  , proxyPort = +argv.proxyPort
  , patterns

if(!port) throw '--port required'
if(patternFile && pattern) throw '--pattern and --patternFile both specified'
if(patternFile) patterns = fs.readFileSync(patternFile).split('\n')
else if(pattern) patterns = [pattern]
if(!patterns) throw '--pattern or --patternFile required'
if(verbose) console.log(argv)

function handleError(err, res) {
  console.error(err)
  res.statusCode = 500
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(err))
}

var server = http.createServer(function (req, res) {

  // Make sure path ends with a slash.
  var parsedUrl = url.parse(req.url)
    , query = querystring.parse(parsedUrl.query)
    , pathname = parsedUrl.pathname
    , filePath = jsDir + pathname
    , matches = patterns.filter(function(p) { return minimatch(filePath, p) })

  if(verbose) {
    console.log('filePath', filePath)
    console.log('patterns', patterns)
  }

  if(proxyPort && !matches.length) {
    console.log(req.method, req.url, '=>', proxyHost + ':' + proxyPort)
    return proxy.proxyRequest(req, res, { host: proxyHost, port: proxyPort })
  }

  console.log(req.method, req.url, '->', filePath)

  if(pathname.indexOf('..') >= 0)
    return handleError('ellipses in path are invalid', res)

  fs.stat(filePath, function(err, stats) { 

    if(err) return handleError(err, res)

    res.setHeader('Last-Modified', stats.mtime)
    res.setHeader("Expires", "Sat, 01 Jan 2000 00:00:00 GMT")
    res.setHeader("Cache-Control",
        "no-store, no-cache, must-revalidate, max-age=0")
    res.setHeader("Cache-Control", "post-check=0, pre-check=0")
    res.setHeader("Pragma", "no-cache")

    var type = mime.lookup(filePath)
    res.setHeader('Content-Type', type)

    if(req.method === 'HEAD') {
      res.setHeader('Content-Length', stats.size)
      return res.end()
    }

    fs.readFile(filePath, function(err, data) { 

      if(err) return handleError(err, res)

      if(matches.length)
        data = 'earhorn$("' + req.url + '", function() {' + data + '})()'

      res.setHeader('Content-Length', data.length)
      res.end(data)
    })
  })

})

server.listen(port)

console.log('Earhorn server listening on', port)
