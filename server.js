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
					//Implement Help Functions
			} else if (data.input.startsWith("@")) {	
				var input = data.input.substr(1);	
				var message = parseMessageChunk(input);					
				sendPrivateMessage(socket, message);
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

function sendPrivateMessage (socket, message) {	

	var clients = findClientsByName(message[0]);
	clients.push(socket);
	try {
		console.log('Clients Found ('+ clients.length+'): ' + clients.map((c) => {return c.name}).join(','));
		var message = [socket.name +': <i>'+ xssFilters.inHTMLData(message[1]) + '</i>'];	
		updateClientChat(clients, message);
	} catch ( e ) {
		var error = new Error();
		console.error("sendPrivateMessage Execption Message: " + e + " stacktrace: " + error);
		log(clients);
		updateClientChat([socket], ["Private Message Failed to Send."]);
	}
}

function parseMessageChunk (message) {
	return message.split(' ');
}

function findClientsByName (name) {
	return clientList.filter((client) => {
		return client.name && name === client.name; 	
	});
		// return clientList.filter((client) => {
	// 	if(client && client.name && name === client.name) { return client; }	
	// });
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