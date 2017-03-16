'use strict';
const fs = require('fs');
const http = require('http');
const url = require("url");
const chipStore = {};

const WRITEWORK_INTERVAL = 1 * 30 * 1000;
const WRITE_SINCE_UPDATE = 1 * 60 * 1000;

const server = http.createServer(function (req, res) {
    var uri = url.parse(req.url).pathname;
    if (req.method == 'POST' && uri === '/chips' && handleChipsRequest(req, res)) {
        return;
    } else {
        invalidResponse(res);
    }

}).listen(8080);

setInterval(writeWork, WRITEWORK_INTERVAL)


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
            feedMe(chips);
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': getAllowedOrigin(req),
            });
            res.write('OK');
            res.end();

        } catch (e) {
            console.log(e.stack);
            console.log(chips);
            invalidResponse(res);
        }
    });

    return true;
}

function getAllowedOrigin(req) {
    let origin = req.headers.origin;
    return origin;
}

function feedMe(chips) {
    const chipJson = JSON.parse(chips);
    const len = chipJson.actions.length;
    if (len === 0) return;

    const timestamplink = chipJson.actions[0][0];
    if (chipStore[timestamplink]) {
        const chips = chipStore[timestamplink];
        const actions = chips.actions;
        chipJson.actions.shift();
        appendArray(actions, chipJson.actions);
        delete chipStore[timestamplink];
        const newtimestamplink = actions[actions.length - 1][0];
        chipStore[newtimestamplink] = chips;
        chips.updatedAt = new Date().getTime();
        console.log("append chips", timestamplink, newtimestamplink)

    } else {
        const actions = chipJson.actions;
        const timestamplink = actions[actions.length - 1][0];
        chipStore[timestamplink] = chipJson;
        chipJson.updatedAt = new Date().getTime();

        console.log("new chips link", timestamplink)
    }

}

function writeWork() {
    const now = new Date();
    for (let link in chipStore) {
        if (now - chipStore[link].updatedAt > WRITE_SINCE_UPDATE) {
            console.log("write", chipStore[link].updatedAt, chipStore[link].actions.length);
            write('\n'+JSON.stringify(chipStore[link]));
            delete chipStore[link];
        }
    }
}

function appendArray(arr0, arr1) {
    arr0.push.apply(arr0, arr1);
}

function write(str) {
    const file = 'datastore/data.log';
    fs.appendFileSync(file, str);
    return str.length;
}