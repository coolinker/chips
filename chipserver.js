'use strict';
const fs = require('fs');
const http = require('http');
const url = require("url");
const os = require("os");
const path = require('path');


const chipStore = {};
const CHECK_WRITE_INTERVAL = 1 * 30 * 1000;
const WRITE_DELAY_SINCE_UPDATE = 1 * 60 * 1000;
const MACHINE_IP = os.networkInterfaces().eth1 ? os.networkInterfaces().eth1[0].address : 'UNKNOWN';
const SERVICE_PORT = 8080;
const PATH_SEP = path.sep;

console.log("PATH_SEP:", PATH_SEP)
console.log("CHECK_WRITE_INTERVAL:", CHECK_WRITE_INTERVAL,'ms');
console.log("WRITE_DELAY_SINCE_UPDATE:", WRITE_DELAY_SINCE_UPDATE, 'ms');


const server = http.createServer(function (req, res) {
    var uri = url.parse(req.url).pathname;
    if (req.method == 'POST' && uri === '/chips' && handleChipsRequest(req, res)) {
        return;
    } else {
        invalidResponse(res);
    }

}).listen(SERVICE_PORT);

console.log('Chips server(', MACHINE_IP, ':'+SERVICE_PORT, ') is up...');

setInterval(writeWork, CHECK_WRITE_INTERVAL)


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
        if (now - chipStore[link].updatedAt > WRITE_DELAY_SINCE_UPDATE) {
            console.log("write", chipStore[link].updatedAt, chipStore[link].actions.length);
            write('\n' + JSON.stringify(chipStore[link]));
            delete chipStore[link];
        }
    }
}

function appendArray(arr0, arr1) {
    arr0.push.apply(arr0, arr1);
}

function write(str) {
    const file = 'datastore'+PATH_SEP+'data.log';
    //str example value: {"site":"www2",actions:[[1489569331453,"mail_message_item"], [1489569331453,"mail_compose_tbbtn"], [1489569331453,"compose_editor_input"],[1489569331453,"compose_to_input"], [1489569331454,"compose_send_btn"]]}
    fs.appendFileSync(file, str);
    return str.length;
}