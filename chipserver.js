'use strict';
const fs = require('fs');
const http = require('http');
const url = require("url");
const os = require("os");
const path = require('path');

const Cookbook = require('./kitchen/cookbook');
const Chef = require('./kitchen/chef');

const chipStore = {};
const CHECK_WRITE_INTERVAL = 1 * 30 * 1000;
const WRITE_DELAY_SINCE_UPDATE = 1 * 60 * 1000;
const MACHINE_IP = os.networkInterfaces().eth1 ? os.networkInterfaces().eth1[0].address : 'UNKNOWN';
const SERVICE_PORT = 8080;
const PATH_SEP = path.sep;
const CELLAR_PATH = 'cellar/data.log'.replace(/\//g, PATH_SEP);

console.log("FLAVOR loaded.");
console.log("PATH_SEP:", PATH_SEP);
console.log("CHECK_WRITE_INTERVAL:", CHECK_WRITE_INTERVAL, 'ms');
console.log("WRITE_DELAY_SINCE_UPDATE:", WRITE_DELAY_SINCE_UPDATE, 'ms');


const server = http.createServer(function (req, res) {
    const uri = url.parse(req.url).pathname;
    if (req.method == 'POST') {
        if (uri === '/chips' && handleChipsRequest(req, res)
            || uri === '/kitchen' && handleKichenRequest(req, res))
            return;
    } else if (uri === '/chipmonitor.js' || uri.indexOf('/chipcharts/') === 0) {
        const filepath = uri.substr(1);
        if (fs.existsSync(filepath)) {
            let content = fs.readFileSync(filepath);
            let ext = path.extname(filepath).substr(1);
            res.writeHead(200, {
                'Content-Type': ext === 'js' ? 'application/javascript;charset=utf-8' : 'text/' + ext + '; charset=UTF-8'
            });

            res.end(content);
        } else {
            invalidResponse(req, res);
        }

    } else {
        invalidResponse(req, res);
    }

}).listen(SERVICE_PORT);

console.log('Chips server(', MACHINE_IP, ':' + SERVICE_PORT, ') is up...');

setInterval(storeWork, CHECK_WRITE_INTERVAL)


function invalidResponse(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': getAllowedOrigin(req),
    });
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
            receive(sort(chips));

            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': getAllowedOrigin(req),
            });
            res.write('OK');
            res.end();

        } catch (e) {
            console.log(e.stack);
            console.log(chips);
            invalidResponse(req, res);
        }
    });

    return true;
}

function getAllowedOrigin(req) {
    let origin = req.headers.origin;
    console.log("getAllowedOrigin", origin)
    return origin;
}

function handleKichenRequest(req, res) {
    let str = '';
    req.on('data', function (data) {
        str += data;
    });

    req.on('end', function () {
        try {
            const json = JSON.parse(str);
            const toserve = cook(json);
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
            });

            res.write(JSON.stringify(toserve));
            res.end();

        } catch (e) {
            console.log(e.stack);
            console.log(str);
            invalidResponse(req, res);
        }
    });

    return true;
}

function cook(info) {
    const menu = Cookbook.dishes[info.dish]
    for (let att in menu) {
        if (info[att]) {
            menu[att] = info[att]
        }
    }

    const cellarRaw = fs.readFileSync(CELLAR_PATH, 'utf-8');
    const toserve = (new Chef()).cook(menu, cellarRaw);

    return toserve;
}

function receive(chipJson) {
    const len = chipJson.ingredients.length;
    if (len === 0) return;

    const timestamplink = chipJson.ingredients[0][0];
    if (chipStore[timestamplink]) {
        const chips = chipStore[timestamplink];
        const ingredients = chips.ingredients;
        chipJson.ingredients.shift();
        appendArray(ingredients, chipJson.ingredients);
        delete chipStore[timestamplink];
        const newtimestamplink = ingredients[ingredients.length - 1][0];
        chipStore[newtimestamplink] = chips;
        chips.updatedAt = new Date().getTime();
        console.log("append chips", timestamplink, newtimestamplink)
    } else {
        const ingredients = chipJson.ingredients;
        const timestamplink = ingredients[ingredients.length - 1][0];
        chipStore[timestamplink] = chipJson;
        chipJson.updatedAt = new Date().getTime();
        console.log("new chips link", timestamplink)
    }

}

function sort(chips) {
    const chipJson = JSON.parse(chips);
    return chipJson;
}

function storeWork() {
    const now = new Date();
    for (let link in chipStore) {
        if (now - chipStore[link].updatedAt > WRITE_DELAY_SINCE_UPDATE) {
            console.log("write", chipStore[link].updatedAt, chipStore[link].ingredients.length);
            write(JSON.stringify(chipStore[link]) + '\n');
            delete chipStore[link];
        }
    }
}

function write(str) {
    const file = 'cellar' + PATH_SEP + 'data.log';
    //str example value: {"domain":"www2",actions:[[1489569331453,"mail_message_item"], [1489569331453,"mail_compose_tbbtn"], [1489569331453,"compose_editor_input"],[1489569331453,"compose_to_input"], [1489569331454,"compose_send_btn"]]}
    fs.appendFileSync(file, str);
    return str.length;
}

function appendArray(arr0, arr1) {
    arr0.push.apply(arr0, arr1);
}
