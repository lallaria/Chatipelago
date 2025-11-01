import fs from "fs";
import path from "path";
import { getCustomConfigPath } from './config-unpacker-esm.js';

export {
	loadFiles,
	connectionInfo,
	streamerbotConfig,
	streamerbotActions,
	mixitupConfig,
	gameSettings,
	mixitup, 
	streamerbot
}

let mixitup = {};
let streamerbot = {};
let connectionInfo = {};
let streamerbotConfig = {};
let streamerbotActions = {};
let mixitupConfig = {};
let gameSettings = {};

function loadFiles(){
	// Use unpacked config path if running as pkg, otherwise use local path
	const customConfigPath = getCustomConfigPath();
	const configPath = path.join(customConfigPath, 'config.json');

	if (!fs.existsSync(configPath)) {
		throw new Error(`Config file not found at ${configPath}. Please ensure customConfig/config.json exists.`);
	}
	
	let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
	mixitup = config["mixitup"];
    streamerbot = config["streamerbot"];
	connectionInfo = config["connectionInfo"];
	streamerbotConfig = config["streamerbotConfig"];
	streamerbotActions = config["streamerbotActions"];
	mixitupConfig = config["mixitupConfig"];
	gameSettings = config["gameSettings"];
}