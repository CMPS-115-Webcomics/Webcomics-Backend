const db = require('../db');

function makeAviliblityValidator(table, attribute) {
    return async (req, res) => {
        try {
            const query = await db.query(`SELECT ${attribute} FROM Comics.${table} WHERE ${attribute}=$1`, [req.query[attribute]]);
            req.json({
                availbile: query.rowCount === 0
            });
        } catch (err) {
            console.error(err);
            res.sendStatus(500);
        }
    };
}

function makeAttributeValidator(params) {
    return (req, res, next) => {
        let missing = [];
        let body = req.body;
        for (let param of params) {
            if (body[param] === undefined) {
                missing.push(param);
            }
        }
        if (missing.length === 0) {
            next();
            return;
        }
        res.status(400)
            .json({
                'message': 'Request lacks required parameter(s).',
                'missing': missing
            });
    }
}

module.exports = {
    availibilityRoute: makeAviliblityValidator,
    requiredAttributes: makeAttributeValidator


}