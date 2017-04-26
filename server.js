var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(3131);

var uniqueAnimals = ['behomoth']
var clientList = [];

var clientChat = [];

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

console.log('Listening for connections');

io.on('connection', function (socket) {
	socket.name = '';
	clientList.push(socket);
	socket.on('initialize', function (data) {
		console.log('New Connection with id: ' + socket.id);									  
		updateClientList(socket);
		updateClientChat(socket);
	});		

	socket.on('disconnect', function() {
      console.log('Client Disconnected ' + socket.id);
      clientList.splice(clientList.indexOf(socket), 1);
			updateClientList(socket);
   });
  
  socket.on('datain', function (data) {
    console.log(socket.id +': '+ data.input);
		clientChat.push(socket.id +': '+ data.input)
		updateClientChat(socket);	
  });
});


function updateClientList (socket) {
	clientList.forEach( function (client) {
		client.emit('updateClientList', {clientIdList: aggregateClientIds()});
	});
		console.log(clientList.length + ' Clients Lists have been updated.');		
}

function updateClientChat (socket) {
	clientList.forEach( function (client) {
		client.emit('updateClientChat', {clientChat: clientChat});
	});
	console.log(clientList.length + ' Clients Chats have been updated.');
	
}

function aggregateClientIds () {
	return clientList.map( function (client) { return client.id;});
}