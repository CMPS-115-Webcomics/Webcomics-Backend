'use strict';

const Jasmine = require('jasmine');
const jasmine = new Jasmine();

jasmine.loadConfig({
    spec_dir: '.',
    spec_files: [
        '*.spec.js',
        'routes/*.spec.js'
    ],
    helpers: [
        'helpers/**/*.js'
    ],
    stopSpecOnExpectationFailure: true,
    random: true
});

jasmine.execute();
