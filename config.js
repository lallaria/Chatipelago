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
const webhookUrl = "https://WEBHOOK.URL"
const gameSettings =
{
	searchAttemptsRequired: 5,
	lootAttemptsRequired: 5,
	lootChance: 0.7,
	allowMultipleMessagesFromSameUser: false, // todo
	checkCooldown: 240, // in seconds
}