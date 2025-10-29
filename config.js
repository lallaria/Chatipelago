import fs from "fs";

export {
	loadFiles,
	connectionInfo,
	streamerbotConfig,
	streamerbotActions,
	webhookUrl,
	gameSettings,
	mixitup, 
	streamerbot
}

let mixitup = {};
let streamerbot = {};
let connectionInfo = {};
let webhookUrl = {};
let streamerbotConfig = {};
let streamerbotActions = {};
let gameSettings = {};

function loadFiles(){
	let config = JSON.parse(fs.readFileSync('customConfig/config.json', 'utf8'));
	mixitup = config["mixitup"];
    streamerbot = config["streamerbot"];
	connectionInfo = config["connectionInfo"];
	webhookUrl = config["webhookUrl"];
	streamerbotConfig = config["streamerbotConfig"];
	streamerbotActions = config["streamerbotActions"];
	gameSettings = config["gameSettings"];
}
