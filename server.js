var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

var validator = require('validator');
var xssFilters = require('xss-filters');

app.listen(3131);

var uniqueAnimals = ['behomoth']
var clientList = [];
var clientChat = [""];

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
		socket.name = data.username;
		//socket.duplicateUsernameCount = clientList.map(function(client) {return client.name = data.username;}).length;			
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
		case 'w': sendPrivateMessage(socket, input.substr(2)); break;
		case 'whoami': updateClientChat([socket], ["You are "+ socket.name]); break;
		case 'time': updateClientChat([socket], ["Current Timestamp: "+ new Date().getTime()]); break;
		case 'help': updateClientChat([socket], ["Availible Commands: /help, /whoami, /time, /w (alias @username), @username"]);
					break;
		case '?': 
					break;
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