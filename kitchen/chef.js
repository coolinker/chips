'use strict';
const fs = require('fs');
const path = require('path');
const PATH_SEP = path.sep;
const CELLAR_PATH = '../cellar/data.log'.replace(/\//g, PATH_SEP);
const EOL = (process.platform === 'win32' ? '\r\n' : '\n');
const cookbook = require('./cookbook');

// const rootTree = {
//     count: 1,
//     children: {
//         "preview-btn": {
//             count: 0,
//             children: {

//             }
//         },
//         "folder-treenode": {
//             count: 0,
//             children: {

//             }
//         }
//     }

// }



module.exports = class Chef {
    constructor() {
    }

    prepareRaw(dish) {
        const raw = fs.readFileSync(CELLAR_PATH, 'utf-8');
        const tree = { count: 1 };
        const orign = cookbook.dishes[dish].orign;
        const batch = cookbook.dishes[dish].batch;

        raw.split(EOL).forEach(function (line) {
            const lineJson = JSON.parse(line);
            if (lineJson.orign === origin && lineJson.batch === batch) {
                layoutAsTree(cookbook.dishes[dish].granularity, tree, lineJson.ingredients);
            }
        });

        return tree;
    }

    layoutAsTree(deepmax, tree, ingredients) {
        const footprint = {};
        const igdlen = ingredients.length;

        for (let i = 0; i < igdlen; i++) {
            const cursor = tree;
            for (let deep = 0; deep < deepmax && deep + i < igdlen; deep++) {
                const item = ingredients[i + deep];
                const igd = item[0];
                if (!cursor.children) {
                    cursor.children = {};
                }
                const children = cursor.children;
                if (!children[igd]) {
                    children[igd] = { count: 0 };
                }

                children[igd].count++;
                cursor = children[igd];
            }
        }

    }

    cutUpRaw(rawPiece) {
        //{"site":"www2", "version": "xxx", actions":[[1489569331458,"mail_message_item"],[1489569331454,"mail_compose_tbbtn"],[1489569331453,"compose_editor_input"],[1489569331453,"compose_to_input"],[1489569331458,"compose_send_btn"]],"updatedAt":1489731766899}
        const pieces = [];

        return pieces;
    }
}
