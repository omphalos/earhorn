Earhorn
=======

JavaScript execution logs.

![earhorn](https://raw.github.com/omphalos/earhorn/master/logo.jpg)

Earhorn instruments your JavaScript and shows you a detailed, reversible, line-by-line log of JavaScript execution, sort of like console.log's crazy uncle.

Demo
====

The demo is [here](http://omphalos.github.io/earhorn/index.html#iframe=examples/mouse.html).  Check it out!

Quick Start
===========

*Step 1*

Add Earhorn to your website.  An easy way:

    git clone https://github.com/omphalos/earhorn

*Step 2*

Add a reference to earhorn.js to your page.

    <script src="/earhorn/earhorn.js"></script>

*Step 3*

Wrap your code with a call to earhorn$.

For example, to instrument this code:

    var x = 3;
    var square = x * x;

Wrap it with a call to earhorn$:

    earhorn$('a made-up label', function() {

      var x = 3;
      var square = x * x;

    })()

The call to earhorn$ just returns an instrumented version of what you pass to it.

*Step 4*

Navigate to /earhorn/index.html.  Then open the web page hosting your JavaScript in a separate tab.

(You can also open your web page in an iframe, by adding iframe=your-web-page-url after the hash.  For example, [/earhorn/index.html#iframe=examples/mouse.html](http://omphalos.github.io/earhorn/index.html#iframe=examples/mouse.html).)

Caveats
=======

This thing is still at the prototype stage, and the code is in flux.  There are some performance issues at the moment with larger codebases.  If you're just using Earhorn on less than 1000 LOC, you'll generally be okay.

Persistence
===========

Earhorn will save your changes in localStorage by default.  This gives you the chance to quickly inspect, edit, and re-run your program.

Instead of localStorage, it's possible to save changes to the file system with the server.js script.  You can give server.js url patterns that it will try to [minimatch](https://github.com/isaacs/minimatch).  Any matched JavaScript url will be wrapped in an $earhorn call as part of the http response, and Earhorn will save changes made through the Earhorn editor to disk.  Run `npm install` then `node server.js` to see command line usage detail.

Possible Enhancements
=====================

Right now, Earhorn gives you a detailed view of code execution.  It should be possible to integrate code instrumentation deeper into the editing experience.  Some possibilities:

1. Instrumentation-based autocomplete for autocomplete that side-steps many of the issues that static JavaScript analysis runs into.
2. Function navigation.  It should be straight-forward to navigate to a function's definition, as well to all of its invokations.
3. Code hot-swapping.  This is something that V8 supports natively, but should be possible with an instrumentation library as well, as instrumented functions can hold references to their uninstrumented code and re-instrument new code at runtime.
4. Remote execution of code.  During instrumentation it's possible to save references to eval inside instrumented functions.  These eval references could be used to remotely invoke code in the proper scope, letting you talk to and edit live functions without setting up breakpoints.  I think this would be a nice addition to the REPLs and breakpoints that coders are already familiar with.

Additionally, custom object visualization should be straightforward to implement.  Currently the object visualization widget is a fixed angular html template.  But it should be straightforward to support user-injected angular templates that vary by object type.

License
=======

MIT
