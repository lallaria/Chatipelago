import * as http from 'http';
import fs from 'fs';

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
    if (req.url === '/home') {
        fs.readFile('home.html', function(err, data) {
            res.writeHead(200, {'Content-Type': 'text/html','Content-Length': data.length});
            res.write(data);
            res.end();
        });
    }
    else {
        onEvent(req.url);
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Hello, World\n');
    }
}).listen(port);

import './bot-get.js'
