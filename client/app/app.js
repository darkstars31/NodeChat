var socket = io(silmarillion.remoteServer +":"+silmarillion.port);	

	var clientListDOM = $('#clientList'),
		input = $('input:text'),
		inputTooltip = $('#input-tooltip'),
		userCount = $('#user-count'),
		connectionStatus = $('#connection-status'),
		chat = $('#chat');

	var clientList = [];
	var chatHistory = [];
	var chatById = document.getElementById('chat');
	var clientName = localStorage.getItem('username');
	var chatHistoryIndex = -1;
	sendUserNameToServer();
	socket.emit('initialize', {});

	$(document).keydown(function (e) {
		switch(e.which) {
			case 38: //uparrow			
						if(chatHistoryIndex < chatHistory.length) {
							chatHistoryIndex++;
						}
						input.val(chatHistory[chatHistoryIndex]);
						break;
			case 40: //downarrow
						if(chatHistoryIndex > 0) {
							chatHistoryIndex--;
							input.val(chatHistory[chatHistoryIndex]);
						} else {
							input.val('');
						}
						
						break;
		}
	});

	input.on('keydown', function () {
		setTimeout( function () {
			if(input.val().startsWith('@')){
				var whisperList = clientList.filter(function (c) {return c != clientName});
				inputTooltip.attr('data-balloon-visible', '');
				if(whisperList.length > 0){
					inputTooltip.attr('data-balloon', 'Whisper: @'+ whisperList.join(', @'));
				} 
			} else {
				inputTooltip.removeAttr('data-balloon-visible');
				setTimeout(function () {
					inputTooltip.attr('data-balloon', '');
				}, 250);
			}
		}, 50);
	});
	
	socket.on('updateClientList', function (data) {
			updateClientList(data);
	});

	socket.on('setUsername', function (data) {
		localStorage.setItem('username', data.username);
	});

	socket.on('connect', function () {
        sendUserNameToServer();
		connectionStatus.html('<span style="color: green;">Online</span>')
	});
	
	socket.on('disconnect', function () {
		connectionStatus.html('<span style="color: red;">Offline</span>')
	});

	socket.on('updateClientChat', function (data) {		 	
		printMessagesToChatWindow(data);
  	});

	socket.on('updatePrivateMessage', function (data) {	
		printMessagesToChatWindow(data);
  	});

	function updateClientList (data) {
		clientList = data.clientIdList;
		clientListDOM.html('');
		userCount.html('Users: ' + data.clientIdList.length);
		data.clientIdList.forEach( function (client) {
			if(client == clientName){
				clientListDOM.append('<li><span style="position: relative;left: -3px;">' +
                '<i class="fa fa-user-circle-o" aria-hidden="true" style="line-height: 1em;"></i>' +
                '</span> <a class="is-info" onclick="javascript:changeUsername();" style="color:white;">'+client+'</a></li>');
			} else {
				clientListDOM.append('<li><i class="fa fa-user" aria-hidden="true" style="line-height: 1em;"></i> '+client+'</li>');
			}		
		});
	}

	function printMessagesToChatWindow (data) {
		if(data.message) {
				data.message.forEach( function (message) {
					chat.append('<li>'+message+'</li>');	
				});		
				chatById.scrollTop = chatById.scrollHeight;
			}
	}

	function changeUsername () {
		localStorage.removeItem('username');
		window.location = window.location;
	}

	function sendUserNameToServer () {
			var username = localStorage.getItem('username') || prompt("Please enter your name:", "");		
			socket.emit('setUsername', { username: username});
			localStorage.setItem('username', username);
	}
  
  function sendChatMessageToServer () {
				socket.emit('datain', { 'input' : input.val()});
				if(input.val() && input.val() != chatHistory[0]) {
					chatHistory.unshift(input.val());
					console.log(chatHistory);
				}
				chatHistoryIndex = -1;
				input.val('');
  }