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
        const def = DETERGENT.origin_default.batch_default[menu.category];
        const blended = {};

        this.flatTree(def, menu.category, blended);

        if (DETERGENT[menu.origin] && DETERGENT[menu.origin][menu.batch] && DETERGENT[menu.origin][menu.batch][menu.category]) {
            const target = DETERGENT[menu.origin][menu.batch][menu.category];
            const cblended = {}
            this.flatTree(def, menu.category, cblended);
            for (const att in cblended) {
                blended[att] = cblended[att];
            }
        }

        return blended;
    }

    flatTree(root, nodename, flated) {

        for (let att in root) {
            let node = root[att];
            if (typeof node === "string") {
                if (flated[node]) console.log("ERROR: duplicated key", node);
                flated[node] = nodename + '.' + att;
            } else if (typeof node === "object") {
                if (node instanceof Array) {
                    node.forEach(function (item) {
                        if (flated[item]) console.log("ERROR: duplicated key", node);
                        flated[item] = nodename + '.' + att;
                    })
                } else {
                    this.flatTree(node, nodename + '.' + att, flated);
                }

            }
        }
    }

    prepareRaw(menu, raw) {
        const tree = this.defaultIngredientObj('root');

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
            if (menu.dates['from']) {
                const from = new Date(menu.dates.from);
                if (chipJson.ingredients[0][0] < from) return null;
            }

            if (menu.dates['to']) {
                const to = new Date(menu.dates.to);
                if (chipJson.ingredients[0][0] > to) return null;
            }
            
            chipJson.ingredients.forEach(function (item) {
                const key = item[1].replace(/ /g, '');
                item[1] = (detergent[key] ? detergent[key] : key);

            });
            return chipJson;
        }
        
    }

    pairs(root, sorted, menu) {
        const ingredients = sorted.ingredients;
        const deepmax = menu.granularity;
        const igdlen = ingredients.length;
        const sourceKeys = menu.source;
        const targetKeys = menu.target;

        let byh, byl, bys;

        if (menu.by['hour']) {
            if (!root.children['byhour']) root.children['byhour'] = this.byDefaultObj('byhour');
            byh = root.children['byhour'].children;
        }

        if (menu.by['lag']) {
            if (!root.children['bylag']) root.children['bylag'] = this.byDefaultObj('bylag');
            byl = root.children['bylag'].children;
        }

        if (menu.by['step']) {
            if (!root.children['bystep']) root.children['bystep'] = this.byDefaultObj('bystep');
            bys = root.children['bystep'].children;
        }

        //{ key: 'bylag', children: {} };
        if (!root.source) root.source = sourceKeys;
        if (!root.target) root.target = targetKeys;


        for (let i = 0; i < igdlen;) {
            const srckey = ingredients[i][1];
            if (sourceKeys.indexOf(srckey) < 0) {
                i++;
                continue;
            }

            let j = i + 1;

            for (; j <= i + deepmax && j < igdlen; j++) {
                let tgtkey = ingredients[j][1];
                if (sourceKeys.indexOf(tgtkey) >= 0) {
                    break;
                }

                if (targetKeys.indexOf(tgtkey) >= 0) {
                    if (byh) {
                        let hourkey = new Date(ingredients[i][0]).getHours();

                        if (!byh[hourkey]) {
                            byh[hourkey] = this.defaultIngredientObj(srckey);
                            byh[hourkey].id = srckey;

                        }
                        this.addPairs(byh[hourkey], sorted, i, j);
                    }

                    if (byl) {
                        let lag = ingredients[j][0] - ingredients[i][0];
                        let lagkey = Math.round(lag / 1000) * 1000;
                        if (!byl[lagkey]) {
                            byl[lagkey] = this.defaultIngredientObj(srckey);
                            byl[lagkey].id = srckey;
                        }
                        this.addPairs(byl[lagkey], sorted, i, j);

                    }

                    if (bys) {
                        let steps = j - i;
                        let stepskey = steps;
                        if (!bys[stepskey]) {
                            bys[stepskey] = this.defaultIngredientObj(srckey);
                            bys[stepskey].id = srckey;
                        }
                        this.addPairs(bys[stepskey], sorted, i, j);

                    }


                    break;
                }

            }

            i = j;

        }
    }

    addPairs(node, sorted, source, target) {
        const origin = sorted.origin;
        const ingredients = sorted.ingredients;
        const srckey = ingredients[source][1];
        const tgtkey = ingredients[target][1];

        if (node['origincounts'][origin] === undefined) {
            node['origincounts'][origin] = 0;
        }

        node['origincounts'][origin]++;
        node.count++;

        if (!node.children[tgtkey]) {
            node.children[tgtkey] = this.defaultIngredientObj(tgtkey);
        }

        var tgtnode = node.children[tgtkey];
        if (tgtnode['origincounts'][origin] === undefined) {
            tgtnode['origincounts'][origin] = 0;
        }

        tgtnode['origincounts'][origin]++;
        tgtnode.count++;
        this.addLag(tgtnode, ingredients[target][0] - ingredients[source][0]);
        this.addSumLag(tgtnode, ingredients[target], ingredients[source]);

    }

    tsTree(root, sorted, menu) {

        const origin = sorted.origin;
        const batch = sorted.batch;
        const ingredients = sorted.ingredients;
        const deepmax = menu.granularity;
        const igdlen = ingredients.length;
        const sourceKeys = menu.source;
        const targetKeys = menu.target;

        for (let i = 0; i < igdlen;) {
            const srckey = ingredients[i][1];
            if (sourceKeys.indexOf(srckey) < 0) {
                i++;
                continue;
            }
            let j = i + 1;
            for (; j < igdlen; j++) {
                if (sourceKeys.indexOf(ingredients[j][1]) >= 0) {
                    //console.log("ERROR source key invalid", ingredients);
                    break;
                }
                if (targetKeys.indexOf(ingredients[j][1]) >= 0) break;
            }

            if (j === igdlen || j - i > deepmax) {
                return;
            }

            if (sourceKeys.indexOf(ingredients[j][1]) >= 0) {
                i++;
                continue;
            }

            let cursor = root;
            let depth = 0;
            let preTime = ingredients[i][0];
            for (; depth < deepmax && depth + i < igdlen;) {
                const item = ingredients[i + depth];
                const igd = item[1];
                if (!cursor.children) {
                    cursor.children = {};
                }
                const children = cursor.children;
                if (children[igd] === undefined) {
                    children[igd] = this.defaultIngredientObj(igd);
                }
                if (children[igd]['origincounts'][origin] === undefined) {
                    children[igd]['origincounts'][origin] = 0;
                }


                children[igd].count++;
                this.addPos(children[igd], item);
                this.addLag(children[igd], item[0] - preTime);
                this.addSumLag(children[igd], item, ingredients[i]);
                preTime = item[0];

                children[igd]['origincounts'][origin]++;
                cursor = children[igd];
                depth++;
                if (targetKeys.indexOf(igd) >= 0) {
                    break;
                }

            }
            i = j + depth;

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

            if (cursor['origincounts'][origin] === undefined) {
                cursor['origincounts'][origin] = 0;
            }
            this.addPos(cursor, ingredients[i]);

            cursor['origincounts'][origin]++;

            let preTime = ingredients[i][0];
            for (let depth = 1; depth < deepmax && depth + i < igdlen; depth++) {
                const item = ingredients[i + depth];
                const igd = item[1];
                if (!cursor.children) {
                    cursor.children = {};
                }
                const children = cursor.children;
                if (children[igd] === undefined) {
                    children[igd] = this.defaultIngredientObj(igd);
                }
                if (children[igd]['origincounts'][origin] === undefined) {
                    children[igd]['origincounts'][origin] = 0;
                }

                children[igd].count++;
                this.addPos(children[igd], item);
                this.addLag(children[igd], item[0] - preTime);
                this.addSumLag(children[igd], item, ingredients[i]);

                preTime = item[0];
                children[igd]['origincounts'][origin]++;
                cursor = children[igd];
            }
        }

    }

    addPos(node, igdItem) {
        node.pos.x += ((igdItem[2][0] - node.pos.x) / node.count);
        node.pos.y += ((igdItem[2][1] - node.pos.y) / node.count);
    }

    addLag(node, lag) {
        node.lag += (lag - node.lag) / node.count;
    }

    addSumLag(node, item, root) {
        node.sumlag += (item[0] - root[0]) / node.count;
    }

    defaultIngredientObj(igd) {
        return { count: 0, key: igd, origincounts: {}, lag: 0, pos: { x: 0, y: 0 }, sumlag: 0, steps: 0, children: {} };
    }

    byDefaultObj(by) {
        return { key: by, children: {} };
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
