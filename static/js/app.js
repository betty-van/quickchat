
// When page is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Prompt user to enter a displayName if not in localStorage
    if (!localStorage.getItem("displayName") && (!localStorage.getItem("currentChannel") && !localStorage.getItem('messages'))) {
        let username = prompt('Enter a display name: ');
        localStorage.setItem('displayName', username);
        localStorage.setItem('currentChannel', 'general');
    }

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Get displayName from local storage and display on the page
    username = localStorage.getItem('displayName');
    document.querySelector('#username').innerHTML = username;

     // Get the current channel and display it on the page
    let currentChannel = localStorage.getItem('currentChannel');
    document.querySelector('#channel-name').innerHTML = "#" + currentChannel;  

    requestMessages(currentChannel);
    
    socket.on('connect', () => {

        // Get message, time stamp, user, and channel to send to server
        document.querySelector('#messageForm').onsubmit = () => {
            let myMessage = document.getElementById('newMessage').value;
            if (myMessage != undefined && myMessage != null && myMessage !== '') {
                let timestamp = new Date();
                timestamp = timestamp.toLocaleString('en-US');
                let user = username;
                let channel = currentChannel;
                console.log ('sent: ' + myMessage + ' at ' + timestamp + ' by ' + user + ' on ' + channel + ' channel.');
                let messageData = {'myMessage': myMessage, 'timestamp': timestamp, 'user': user, 'current_channel': channel};
                socket.emit('send message', messageData);
                document.getElementById('newMessage').value = '';
            }
            return false;
        };

        // Add message to the messageList
        socket.on('message received', (messageData) => {
            if (messageData['current_channel'] == currentChannel) {
                let myMessage = messageData['myMessage'];
                let timestamp = messageData['timestamp'];
                let user = messageData['user'];
                let channel = messageData['current_channel'];
                let completeMessage = (`${user} ${timestamp}: ${myMessage}`)
                console.log('received on ' + channel + ': ' + completeMessage);

                // Add button to delete message
                const button = document.createElement('button');
                button.setAttribute('data-myMessage', myMessage);
                button.setAttribute('data-timestamp', timestamp);
                button.setAttribute('data-user', user);
                button.setAttribute('data-channel', channel);
                button.id = 'deleteThisMessage';
                button.innerHTML = 'X';
                button.onclick = deleteMessages;

                // Append to the messageList
                let ul = document.getElementById('messageList');
                let li = document.createElement('li');
                li.appendChild(document.createTextNode(completeMessage));
                li.setAttribute("id", "message");
                li.appendChild(button);
                ul.appendChild(li);  
            }
            
            return 0;
        });

        // When new channel form is completed, emit a new channel event
        document.querySelector('#newChannelForm').onsubmit = () => {
            const newChannel = document.querySelector('#newChannel').value;
            console.log(newChannel);
            socket.emit('submit new channel', {newChannel});
            return newChannel;
        }

        // When hear new channel, add it to the channels list without refresh!
        socket.on('new channel', (newChannel) => {
            console.log(newChannel);
            const channelName = newChannel["newChannel"];
            // To show up without refresh from other users

            const form = document.createElement('form');
            form.setAttribute('id', 'switchChannelForm');

            const button = document.createElement('button');
            button.id = 'submitSwitchChannel';
            button.setAttribute('type', 'submit');
            button.setAttribute('value', channelName);
            button.onclick = switchChannel;

            const li = document.createElement('li');
            li.innerHTML = `# ${channelName}`;
            li.setAttribute('id', 'channelOption');

            button.appendChild(li);
            form.appendChild(button);
            console.log(form);
            document.querySelector('#channels').append(form);
            document.querySelector('#newChannel').value = '';
            document.querySelector('#submitNewChannel').disabled = true;
            
        })

        // Adding function switchChannel to onClick for each button
        document.querySelectorAll('#submitSwitchChannel').forEach(button => {
            button.addEventListener('click', switchChannel);
        })   
        
        // Adding function delete Messages to onClick for each button
        document.querySelectorAll('#deleteThisMessage').forEach(button => {
            button.addEventListener('click', deleteMessages);
        })    
    });

    function switchChannel() {
        // Assign this function to button.onclick in the channel form
        console.log(this.value);

        // Leaving a room means seeing if the button they clicked is equivalent to where they are or not
        var roomToLeave = localStorage.getItem("currentChannel");
        // If not the same, change the currentChannel to the new one and get their user name
        if (this.value != roomToLeave) {
            let currentChannel = this.value;
            let currentUser = localStorage.getItem("displayName");

            socket.emit("join", currentChannel);
            socket.emit("leave", roomToLeave);

            // Now change localstorage to new channel
            localStorage.setItem("currentChannel", currentChannel);
            requestMessages(currentChannel);

            // TODO - change the buttons once clicked
            return currentChannel;
        }     
    }

    // Make request to server to display messages
    function requestMessages(currentChannel) {
            // Get information about messages in the channel and display on the current page
        const request = new XMLHttpRequest();
        request.open('POST', '/');

        // Callbackfunction for when request completes
        request.onload = () => {
            const data = JSON.parse(request.responseText);

            if (data.success) {
                console.log(data);
                displayMessages(data);
                return 0;
            }
            else {
                console.log('error');
                return -1;
            }
        };

        const data = new FormData();
        data.append('currentChannel', currentChannel);
        
        request.send(data);
        return false;
    }

    // Display messages in messageList
    function displayMessages(data) {
        let messages = data['message'];
        for (let i = 1; i < messages.length; i++) {
            let myMessage = messages[i]['myMessage'];
            let timestamp = messages[i]['timestamp'];
            let user = messages[i]['user'];
            let channel = messages[i]['current_channel'];
            let completeMessage = (`${user} ${timestamp}: ${myMessage}` )
            console.log(completeMessage + ' ' + channel);

            // Add a button to delete messages
            const button = document.createElement('button');
            button.setAttribute('data-myMessage', myMessage);
            button.setAttribute('data-timestamp', timestamp);
            button.setAttribute('data-user', user);
            button.setAttribute('data-channel', channel);
            button.id = 'deleteThisMessage';
            button.innerHTML = 'X';
            button.onclick = deleteMessages;

            // Append to the messageList
            let ul = document.getElementById('messageList');
            let li = document.createElement('li');
            li.appendChild(document.createTextNode(completeMessage));
            li.setAttribute("id", "message");
            li.appendChild(button);
            ul.appendChild(li);  
        }
        return 0;
    }

    function deleteMessages() {
        // This is how to access...now to transfer to socket?
        console.log(this.dataset);
        const data = this.dataset;
        const li = this.parentElement;
        const ul = document.querySelector('#messageList');
        console.log(li);
        ul.removeChild(li)

        socket.emit('delete Message', data)
    }

    return 0;
})
