import fs from "fs";

export {
	connectionInfo,
	webhookUrl,
	gameSettings
}
let config = JSON.parse(fs.readFileSync('customConfig/config.json', 'utf8'));

const connectionInfo = config["connectionInfo"];
const webhookUrl = config["webhookUrl"];
const gameSettings = config["gameSettings"];