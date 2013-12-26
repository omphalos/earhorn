earhorn
=======

JavaScript execution logs.

![earhorn](https://raw.github.com/omphalos/earhorn/master/logo.jpg)

Earhorn instruments your JavaScript and shows you a detailed, reversible, line-by-line log of JavaScript execution, sort of like a console.log on steroids.

Demo
====

The demo is [here](http://omphalos.github.io/earhorn/index.html?iframe=mouse-iframe-demo.html) and explains earhorn much better than a README can.

Quick Start
===========

Step 1
------

Add earhorn to your website.  An easy way:

    git clone https://github.com/omphalos/earhorn --depth 1

Step 2
------

Add a reference to earhorn.js to your page.

    <script src="/earhorn/earhorn.js"></script>

Step 3
------

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

Step 4
------

Navigate to /earhorn/index.html.  Then open the web page hosting your JavaScript in a separate tab.

(You can also open your web page in an iframe, by adding iframe=your-web-page-url after the hash.  For example, /earhorn/index.html#iframe=sandbox.html.)

Caveats
=======

This thing is still in an experimental phase, and the code is in flux.  There are some performance issues at the moment with larger codebases.  If you're just using earhorn on smaller portions of code, you'll generally be okay.

License
=======

MIT
