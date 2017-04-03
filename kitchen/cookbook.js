
module.exports = cookbook = {
    "ingredients": {
        "0": ['mail-compose-send-btn', 'mail-compose-save-btn'],
        "1": ['mail-compose-discard-btn', 'mail-compose-x-btn'],
    },

    "dishes": {
        "single-piece": {
            "granularity": 1,
            "ingredients": [0, 1],
            "exclude-ingredients":null,
            "origins": "*",
            "batch": "*",
        },
        "treelike": {
            "granularity": 3,
            "rootkey":null,
            "origins": "*",
            "batch": "*",
        },
        "treediff": {
            "granularity": 3,
            "rootkey":null,
            "origins": ['172.26.204.232-uia','172.26.204.233'],
            "batch": "*",
        }

    }
}