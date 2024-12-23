export {
	connectionInfo,
	webhookUrl,
	gameSettings
}

const connectionInfo = 
{
	hostname: "localhost",
	port: 38281,
	playerName: "Chat",
	tags: ['AP','DeathLink'],
}
const webhookUrl = "https://api.mixitupapp.com/api/webhook/5dfc7fe2-c6c9-46c6-b472-08dc9d316ad3?secret=4B1535B9B60C1CF534B9E470B54339681340C1013861FBDB51A1BBC897BC7C0E"
const gameSettings =
{
	searchAttemptsRequired: 5,
	lootAttemptsRequired: 5,
	lootChance: 0.7,
	checkCooldown: 240, // in seconds
}