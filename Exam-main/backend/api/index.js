const { app, dbReady } = require("../server");

module.exports = async (req, res) => {
	await dbReady;
	return app(req, res);
};