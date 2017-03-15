'use strict';
const fetch = require('node-fetch');
const fs = require('fs');
const http = require('http');

const server = http.createServer(function (req, res) {
    var uri = url.parse(req.url).pathname;
    if (req.method == 'POST' && uri === '/chips' && handleChipsRequest(req, res)) {
        return;
    } else {
        invalidResponse(res);
    }

}).listen(8080);

function invalidResponse(res) {
    res.writeHead(200);
    res.write('Invalid request!');
    res.end();
}

function handleChipsRequest(req, res) {
    let chips = '';
    req.on('data', function (data) {
        chips += data;
    });

    req.on('end', function () {
        try {
            feedMe(chips, function (output) {
                res.writeHead(200, {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Access-Control-Allow-Origin': getAllowedOrigin(req),
                });
                res.write(output);
                res.end();
            });

        } catch (e) {
            console.log(e.stack);
            console.log(reqdata);
            invalidResponse(res);
        }
    });

    return true;
}

function getAllowedOrigin(req) {
    let origin = req.get('origin');
    return origin;
}

function feedMe(chips, callback) {
    const file = 'datastore/data.chp';
    fs.appendFile(file, chips, function (err) {
        if (err) return console.log(err);
        callback('1');
    });
    
}