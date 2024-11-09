module.exports = {
	connectionInfo: 
	{
		hostname: "localhost",
		port: 38281,
		playerName: "Chat",
		tags: ['AP','DeathLink'],
	},
	webhookUrl: "https://api.mixitupapp.com/api/webhook/5c364489-fdbd-4b94-b3e5-08dc9d316ad3?secret=7601FDFB6F750EDD49D6032B75D5C7DB6EAC0EA94E71BE2E3E6D1FBF4C7A21E4",
	gameSettings: 
	{
		searchAttemptsRequired: 5,
		lootAttemptsRequired: 5,
		lootChance: 0.7,
		allowMultipleMessagesFromSameUser: false, // todo
		checkCooldown: 300, // in seconds
	}
}