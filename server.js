import * as http from 'http';

export { setOnEvent, sayGoodBye }

var onEvent;

function setOnEvent(fct) {
    onEvent = fct;
}

function sayGoodBye() {
    process.exit();
}

'use strict';

var port = process.env.PORT || 1337;

http.createServer(function (req, res) {
    onEvent(req.url);

    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello, World\n');
}).listen(port);

import './bot-get.js'
