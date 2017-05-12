var http = require('http');
var app = http.createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');

var validator = require('validator');
var xssFilters = require('xss-filters');

app.listen(3131);

var clientList = [];
var clientChat = [""];

var RockPaperSissorsGameIsActive = false;
var RockPaperSissorsPlayersAndMoves = [];

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });}


console.log('NodeChat Server v-Alpha');
console.log('Listening for connections');

io.on('connection', function (socket) {
	var self = this;
	socket.name = '';
	clientList.push(socket);
	socket.on('initialize', function (data) {
		console.log('New Connection with id: ' + socket.id);									  
		updateClientList(clientList);
		updateClientChat([socket], clientChat);
	});		

	socket.on('setUsername', function (data) {	
		if(findClientsByName(data.username).length > 1) {
			socket.name = data.username + "("+findClientsByName(data.username).length+")";
			socket.emit('setUsername', { username: socket.name });
			updateClientList(clientList);
		} else {
			socket.name = data.username;
		}	
	});
	
	socket.on('disconnect', function() {
      	console.log('Client Disconnected ' + socket.id);
      	clientList.splice(clientList.indexOf(socket), 1);
		updateClientList(clientList);
   });
  
  socket.on('datain', function (data) {
		if(data.input !== '' || null) {
			if(data.input.startsWith("/")){				
				handleUserCommands(socket, data.input);
			} else if (data.input.startsWith("@")) {										
				sendPrivateMessage(socket, data.input);
			} else {
				console.log(socket.name +': '+ data.input);
				//var name = (socket.duplicateUsernameCount > 0) ? socket.name+"("+socket.duplicateUsernameCount+")": socket.name; 
				var message = [socket.name +': '+ xssFilters.inHTMLData(data.input)];
				clientChat.push(message);
				updateClientChat(clientList, message);	
			}
		}
  });
});

function sendPrivateMessage (socket, input) {	
	var name = parseMessageChunk(input.substr(1))[0];	
	var message = input.substr(name.length + 1);
	var clients = findClientsByName(name);
	if(clients.length < 1){
		updateClientChat([socket], ["No user found with the name "+name]);
		return;
	}
	clients.push(socket);
	try {	
		var message = ['<i>'+socket.name +' w/ '+name+': '+ xssFilters.inHTMLData(message) + '</i>'];	
		updateClientChat(clients, message);
	} catch ( e ) {
		var error = new Error();
		console.error("sendPrivateMessage Execption Message: " + e + " stacktrace: " + error);
		log(clients);
		updateClientChat([socket], ["Private Message Failed to Send."]);
	}
}

function handleUserCommands (socket, input) {
	var command = parseMessageChunk(input.substr(1))[0];
	switch(command) {
		case 'slap': updateClientChat(clientList, [socket.name + " slaps " + parseMessageChunk(input)[1] + " with a " + (parseMessageChunk(input)[2] ? parseMessageChunk(input)[2] : "fish")]); break;
		case 'roll':  try { updateClientChat(clientList, [socket.name + " " + rolldice(parseMessageChunk(input)[1])]); } 
						catch (e) {updateClientChat(socket, ['Invalid roll, parameters required to be in the form of \'1d6\' or \'3d20\'']);} break;
		case 'rockpapersissors':
		case 'rps': rockpapersissors(socket, parseMessageChunk(input)[1]); break;
		case 'rock': rockpapersissors(socket, parseMessageChunk(command)[0]); break;
		case 'paper': rockpapersissors(socket, parseMessageChunk(command)[0]); break;
		case 'scissor' :
		case 'scissors': rockpapersissors(socket, parseMessageChunk(command)[0]); break;
		case 'giphy': giphy(input.substr(5)).then(function (data) { 
								var response = data[0];
								updateClientChat(clientList, [socket.name + ": <iframe src="+response.embed_url+" />"]);
							}); break;
		case 'whoami': updateClientChat([socket], ["You are "+ socket.name]); break;
		case 'users': updateClientChat([socket], ["Users: " +aggregateClientIds().join(', ')]); break;
		case 'time': updateClientChat([socket], ["Current Timestamp: "+ new Date().getTime()]); break;
		case '?':
		case 'help': updateClientChat([socket], ["Available Commands: /help, /slap, /giphy, /roll, /rockpapersissors (/rps, /rock, /paper, /scissors), /users, /whoami, /time, @username"]);
					break;;
		default: updateClientChat([socket], ["Invalid Command, type /help to get more information."]);
					break;
	}
}

function parseMessageChunk (message) {
	return message.split(' ');
}

function findClientsByName (name) {
	return clientList.filter((client) => {
		return client.name && name === client.name; 	
	});
}

function rockpapersissors(socket, input) {
	if(!RockPaperSissorsGameIsActive) {
		RockPaperSissorsGameIsActive = true;
		updateClientChat(clientList, [socket.name + " has started a game of RockPaperScissors! You have 15 seconds to play."]);
		setTimeout( () => {
			RockPaperSissorsPlayersAndMoves.forEach( (player1) => {
				RockPaperSissorsPlayersAndMoves.forEach( (player2) => {
					if(player1 != player2){
						if(player1.move == player2.move){
							player1.ties++
							return;
						}
						switch(player1.move){
							case 'rock': player2.move === 'scissors' ? player1.wins++ : player1.losses++;
										break;
							case 'paper': player2.move === 'rock' ? player1.wins++ : player1.losses++;
										break;
							case 'scissors': player2.move === 'paper' ? player1.wins++ : player1.losses++;
										break;
						}	
					}
				});				
			});
			var winner = {winPercentage: 0};
			RockPaperSissorsPlayersAndMoves.forEach( (player) => {
				player.winPercentage = player.wins  / (player.wins + player.losses);
				winner = player.winPercentage > winner.winPercentage ? player : winner;
			});
			updateClientChat(clientList, ["RockPaperScissors has ended. Winner: " + winner.name + " threw "+ winner.move +
											" with "+ winner.winPercentage.toPrecision(3) * 100 + "%"]);
			RockPaperSissorsGameIsActive = false;
		}, 15 * 1000);
	} else {
		var move = '';
		switch(input){
			case 'rock': move = 'rock'; break;
			case 'paper': move = 'paper'; break;
			case 'scissors': move = 'scissors'; break;
			default: break;
		}
		if(move && RockPaperSissorsPlayersAndMoves.map(x => x.name != socket.name)){
			updateClientChat([socket], ["You threw "+ move]);
			RockPaperSissorsPlayersAndMoves.push({name: socket.name, move: move, wins: 0, losses: 0, ties: 0});
		}
	}
}

function rolldice(diceType) {
	diceType = diceType ? diceType : "1d6";
	var rollSplit = diceType.split('d');
	rollSplit[0] = rollSplit[0] ? rollSplit[0] : 1;
	var rolls = [];
	var grandTotalString = '';
	for(var i = 0; i < rollSplit[0];i++){
		rolls.push(Math.abs(Math.floor(Math.random()* rollSplit[1] + 1)));
	}
	if(rolls.length > 1){
		grandTotalString = " = "+ rolls.reduce(function (a,b) {return a+b}, 0)
	} else if (rolls.length == 0) {
		rolls[0] = "wtf did you just roll?";
	}
	return "rolled "+diceType+" -> "+ rolls.join(' + ') + grandTotalString;
}

function giphy(searchTerm) {
	var dfd = new Promise(function (resolve, reject) {
		var url = "http://api.giphy.com/v1/gifs/search?q="+parseMessageChunk(searchTerm).join("+")+"&limit=1&api_key=dc6zaTOxFJmzC";
			http.get(url, function (response) {
				var data = '';
				response.on('data', function (stream) {	data +=stream;});
				response.on('end', function () { resolve(JSON.parse(data).data)});
			});
	});

	return dfd;
}

function updateClientList (clients) {
	clients.forEach( function (client) {
		client.emit('updateClientList', {clientIdList: aggregateClientIds()});
	});
	console.log(clientList.length + ' Clients Lists have been updated. ' + aggregateClientIds().join(","));		
}

function updateClientChat (clients, message) {
	clients.forEach( function (client) {
		client.emit('updateClientChat', {message: message});
	});
	console.log(clientList.length + ' Clients Chats have been updated.');	
}

function log(message) {
	var file = 'log.txt';
	fs.appendFile('log.txt', 'ERROR: ' , message, function (err) {if(err) throw err;});
	fs.appendFile('log.txt', '\r\n', function (err) {if(err) throw err;});
}

function aggregateClientIds () {
	return clientList.map( function (client) { return client.name;});
}