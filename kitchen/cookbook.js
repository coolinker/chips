
module.exports = cookbook = {
    "ingredients": {
        "0": ['mail-compose-send-btn', 'mail-compose-save-btn'],
        "1": ['mail-compose-discard-btn', 'mail-compose-x-btn'],
    },

    "dishes": {
        "pairs": {
            "layout": "pairs",
            "granularity": 1,
            "source":[],
            "target": [],
            "origins": "*",
            "batch": "*",
        },
        "treelike": {
            "layout": 'tree',
            "granularity": 3,
            "rootkey":null,
            "origins": "*",
            "batch": "*",
        },
        "targetSource": {
            "source": ['mail.toolbar.compose.button' ],
            "target": ['mail.compose.send.button', 'mail.compose.discard.button', 'toolbar.close.button'],
            "layout": 'tsTree',
            "granularity": 20,
            "origins": "*",
            "batch": "*",
        }

    }
}