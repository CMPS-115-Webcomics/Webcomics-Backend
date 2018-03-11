'use strict';

const passwords = require('./passwords');

describe('Passwords', () => {

    it('should hash a password', async () => {
        const result = await passwords.getHashedPassword('test');
        expect(result.hash).toBeTruthy();
        expect(typeof result.hash).toBe('string');
        expect(typeof result.salt).toBe('string');
    });

    it('should verify a hashed password', async () => {
        const str = 'test';
        const result = await passwords.getHashedPassword(str);
        const matches = await passwords.checkPassword(str, result.hash, result.salt);
        expect(matches).toBe(true);
    });

    it('should reject an incorrect password', async () => {
        const str = 'test';
        const result = await passwords.getHashedPassword(str);
        const matches = await passwords.checkPassword('test2', result.hash, result.salt);
        expect(matches).toBe(false);
    });

});
