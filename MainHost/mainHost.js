import * as http from 'http';
import * as docker from './gameGenerator.js'
import fs from "fs";

'use strict';

var port = process.env.PORT || 80;

docker.buildDocker()

http.createServer(function (req, res) {
    var strMessage = req.url;
    strMessage = strMessage.replace('/', "");
    strMessage = strMessage.replaceAll('+', " ");

    if (strMessage === "create") {
        let newPort = docker.startInstance(req);

        res.writeHead(200, {'Content-Type': 'text/html'});
        let script = `<script>window.onload = function() {window.location.replace('http://'+window.location.hostname+':${newPort}/home');}</script>`;
        res.end(script);
    }
    else {
        fs.readFile('home.html', function(err, data) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(data);
            res.end();
        });
    }


}).listen(port);

