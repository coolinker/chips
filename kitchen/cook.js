const fs = require('fs');
const path = require('path');
const PATH_SEP = path.sep;
const CELLAR_PATH = '../cellar/test.log'.replace(/\//g, PATH_SEP);
const cookbook = require('./cookbook');

const Chef = require('./chef');
const dish = 'single-piece';

const cellarRaw = fs.readFileSync(CELLAR_PATH, 'utf-8');
        
(new Chef()).cook(cookbook.dishes[dish], cellarRaw);