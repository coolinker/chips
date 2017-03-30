
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
            "origin": "*",
            "batch": "*",
        },
        "3-pieces": {
            "granularity": 3,
            "ingredients": [0, 1],
            "exclude-ingredients":null,
            "origin": "domain.com",
            "batch": "###",
        }
    }
}