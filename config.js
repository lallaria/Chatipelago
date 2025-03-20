import fs from "fs";

export {
	loadFiles,
	connectionInfo,
	webhookUrl,
	gameSettings
}

let connectionInfo = {};
let webhookUrl = {};
let gameSettings = {};

function loadFiles(){
	let config = JSON.parse(fs.readFileSync('customConfig/config.json', 'utf8'));
	connectionInfo = config["connectionInfo"];
	webhookUrl = config["webhookUrl"];
	gameSettings = config["gameSettings"];
}

