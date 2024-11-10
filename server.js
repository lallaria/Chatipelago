/*
Needs to be able to connect to AP - it can be part of command line startup
https://www.npmjs.com/package/archipelago.js

*/
import * as http from 'http';

export { setOnEvent }

var onEvent;

function setOnEvent(fct) {
    onEvent = fct;
}

'use strict';

var port = process.env.PORT || 1337;

http.createServer(function (req, res) {
    onEvent(req.url);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');
}).listen(port);

import './bot-get.js'
