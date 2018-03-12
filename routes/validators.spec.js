'use strict';

const validators = require('./validators');

describe('Validators', () => {

    it('should exist', async () => {
        expect(validators.canModifyComic).toBeTruthy();
    });

    /*it('needs better test', async () => {
        expect(false).toBeTruthy();
    });*/

});
