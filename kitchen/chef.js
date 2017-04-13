'use strict';
const fs = require('fs');
const EOL = '\n';//(process.platform === 'win32' ? '\r\n' : '\n');

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

    blendDetergent(menu) {
        const DETERGENT = JSON.parse(fs.readFileSync('detergent.json', "utf-8"));
        const def = DETERGENT.origin_default.batch_default;
        const blended = {};

        for (const att in def) {
            blended[att] = def[att];
        }

        if (DETERGENT[menu.origin] && DETERGENT[menu.origin][menu.batch]) {
            const target = DETERGENT[menu.origin][menu.batch];
            for (const att in target) {
                blended[att] = target[att];
            }
        }

        return blended;
    }

    prepareRaw(menu, raw) {
        const tree = { count: 0 };
        const origin = menu.origin;
        const batch = menu.batch;
        const detergent = this.blendDetergent(menu);
        const me = this;
        raw.split(EOL).forEach(function (line) {
            if (!line) return;
            const sorted = me.sort(line, menu, detergent);
            if (sorted) {
                me[menu['layout']](tree, sorted, menu);
            }
        });

        return tree;
    }


    sort(chips, menu, detergent) {
        const chipJson = JSON.parse(chips);
        const origin = chipJson.origin;
        const batch = chipJson.batch;
        if (menu.origins !== '*' && menu.origins.indexOf(origin) < 0 || menu.batch !== '*' && batch !== menu.batch) return null;
        if (detergent && chipJson.ingredients) {
            chipJson.ingredients.forEach(function (item) {
                const key = item[1].replace(/ /g, '');
                item[1] = (detergent[key] ? detergent[key] : key);

            });
        }
        return chipJson;
    }

    tsTree(root, sorted, menu) {
        const origin = sorted.origin;
        const batch = sorted.batch;
        const ingredients = sorted.ingredients;
        const deepmax = menu.granularity;
        const igdlen = ingredients.length;
        const sourceKeys = menu.source;
        const targetKeys = menu.target;

        root.key = 'root';
        for (let i = 0; i < igdlen; i++) {
            const srckey = ingredients[i][1];
            if (sourceKeys.indexOf(srckey) < 0) continue;
            let j=i+1;
            for (; j<igdlen; j++) {
                if (sourceKeys.indexOf(ingredients[j][1]) >=0 ) {
                    console.log("ERROR source key invalid", ingredients);
                }
                if (targetKeys.indexOf(ingredients[j][1]) >=0 ) break;
            }
            if (j === igdlen) {
                return;
            }

            let cursor = root;
            let depth = 0;
            for (; depth < deepmax && depth + i < igdlen; depth++) {
                const item = ingredients[i + depth];
                const igd = item[1];
                if (!cursor.children) {
                    cursor.children = {};
                }
                const children = cursor.children;
                if (children[igd] === undefined) {
                    children[igd] = { count: 0, key: igd, origincounts: {}, pos:{x:0, y:0} };
                }
                if (children[igd]['origincounts'][origin] === undefined) {
                    children[igd]['origincounts'][origin] = 0;
                }
                
                
                children[igd].count++;
                children[igd].pos.x += ((item[2][0] - children[igd].pos.x)/children[igd].count);
                children[igd].pos.y += ((item[2][1] - children[igd].pos.y)/children[igd].count);

                children[igd]['origincounts'][origin]++;
                cursor = children[igd];

                if (targetKeys.indexOf(igd) >= 0) {
                    break;
                }

            }
            i += depth;

        }
    }

    tree(root, sorted, menu) {
        const origin = sorted.origin;
        const batch = sorted.batch;
        const ingredients = sorted.ingredients;
        const rootkey = menu.rootkey;
        const deepmax = menu.granularity;
        const igdlen = ingredients.length;
        root.key = rootkey;
        for (let i = 0; i < igdlen; i++) {
            if (rootkey && ingredients[i][1] !== rootkey) continue;
            let cursor = root;
            cursor.count++;
            if (cursor['origincounts'] === undefined) {
                cursor['origincounts'] = {};
            }
            if (cursor['origincounts'][origin] === undefined) {
                cursor['origincounts'][origin] = 0;
            }
            cursor['origincounts'][origin]++;


            for (let depth = 1; depth < deepmax && depth + i < igdlen; depth++) {
                const item = ingredients[i + depth];
                const igd = item[1];
                if (!cursor.children) {
                    cursor.children = {};
                }
                const children = cursor.children;
                if (children[igd] === undefined) {
                    children[igd] = { count: 0, key: igd, origincounts: {}, pos:{x:0, y:0} };
                }
                if (children[igd]['origincounts'][origin] === undefined) {
                    children[igd]['origincounts'][origin] = 0;
                }

                children[igd].count++;
                
                children[igd].pos.x += ((item[2][0] - children[igd].pos.x)/children[igd].count);
                children[igd].pos.y += ((item[2][1] - children[igd].pos.y)/children[igd].count);

                children[igd]['origincounts'][origin]++;
                cursor = children[igd];
            }
        }

    }


    cook(menu, raw) {
        const rawReadyAsTree = this.prepareRaw(menu, raw);
        //const depth = menu.granularity;
        // const nodes = [];
        // this.getTreeNodes(rawReadyAsTree, depth, nodes);
        // nodes.sort(function (n0, n1) {
        //     if (n0.count > n1.count) return -1;
        //     else if (n0 < n1.count) return 1;

        //     return 0;
        // })

        // console.log("nodes:", nodes.length);
        const root = this.normalizeTree(rawReadyAsTree);
        return root;
    }

    normalizeTree(treeWithMap) {
        const root = {};
        for (let att in treeWithMap) {
            if (att !== 'children')
                root[att] = treeWithMap[att];
        }

        if (treeWithMap.children) {
            const children = treeWithMap.children;
            root.children = [];
            for (let att in children) {
                const child = this.normalizeTree(children[att]);
                child.key = att;
                root.children.push(child);

            }
        }
        return root;
    }

    getTreeNodes(treeNode, depth, nodes) {
        const children = treeNode.children;
        if (!children) {
            return;
        }

        if (depth === 1) {
            for (let key in children) {
                children[key].keyOfParent = key;
                nodes.push(children[key]);
            }
        } else {
            for (let key in children) {
                this.getTreeNodes(children[key], --depth, nodes);
            }
        }

    }

}
