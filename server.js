/*
Needs to be able to connect to AP - it can be part of command line startup
https://www.npmjs.com/package/archipelago.js

*/

var onEvent;

module.exports = {
    setOnEvent: function (fct) {
        onEvent = fct;
    }
}
'use strict';
var http = require('http');
var port = process.env.PORT || 1337;

http.createServer(function (req, res) {
    onEvent(req.url);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');
}).listen(port);

var bot = require('./bot-get.js');