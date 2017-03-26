'use strict';

const EOL = (process.platform === 'win32' ? '\r\n' : '\n');

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

    prepareRaw(menu, raw) {
        const tree = { count: 1 };
        const origin = menu.origin;
        const batch = menu.batch;
        const me = this;
        raw.split(EOL).forEach(function (line) {
            if (!line) return;
            const lineJson = JSON.parse(line);
            if (lineJson.origin === origin && lineJson.batch === batch) {
                me.layoutAsTree(menu.granularity, tree, lineJson.ingredients);
            }
        });

        return tree;
    }

    layoutAsTree(deepmax, tree, ingredients) {
        const footprint = {};
        const igdlen = ingredients.length;

        for (let i = 0; i < igdlen; i++) {
            let cursor = tree;
            for (let deep = 0; deep < deepmax && deep + i < igdlen; deep++) {
                const item = ingredients[i + deep];
                const igd = item[1];
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

    cook(menu, raw) {
        const rawReadyAsTree = this.prepareRaw(menu, raw);
        const depth = menu.granularity;
        const nodes = [];
        this.getTreeNodes(rawReadyAsTree, depth, nodes);
        nodes.sort(function(n0, n1){
            if (n0.count > n1.count) return -1;
            else if (n0 < n1.count) return 1;

            return 0;
        })

        //console.log("nodes:", nodes.length);
        const root = this.normalizeTree(rawReadyAsTree);
        return root;
    }

    normalizeTree(treeWithMap){
        const root = {};
        root.count = treeWithMap.count;
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
