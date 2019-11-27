import os

from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, send
import json

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Storing channels in the server as an object
channelList = {"general": [{'user': 'default', 'myMessage': 'default', 'timestamp': '11/23/2019 8:00:00 PM'}]}
# Initialize in general chat
currentChannel = {"initial": "general"}

@app.route("/", methods=["POST", "GET"])
def index():

    # If request is GET, meaning you didn't fill out a form to add a channel, render list of channels
    if request.method == "GET":
        return render_template("index.html", channelList=channelList)
    if request.method == "POST":
        channel = request.form.get('currentChannel')
        print(f"Requesting information from {channel}.")
        if (channelList[channel]):
            print(channelList)
            data = channelList[channel];
            return jsonify({"success": True, "message": data})
        else:
            print(channelList)
            return jsonify({"success": False})

# Adding new channels
@socketio.on('submit new channel')
def addChannel(newChannel):
    print(newChannel)

    if newChannel["newChannel"] and (newChannel["newChannel"] not in channelList):
        channelList[newChannel["newChannel"]] = [{'user': 'default', 'myMessage': 'default', 'timestamp': '11/23/2019 8:00:00 PM'}]
        print(channelList)
        print(currentChannel)
        emit("new channel", newChannel, broadcast=True)
        return jsonify({"success": True})
    else:
        return jsonify({"success": False})

# Listening for a 'send message' event and mirror that to all clients
@socketio.on('send message')
def handleMessage(messageData):
    # Add message to the currentChannel
    user = messageData['user']
    myMessage = messageData['myMessage']
    timeSent = messageData['timestamp']
    channel = messageData["current_channel"]
    channelMessageCount = len(channelList[channel])
    # Adding to the server-side  object
    channelList[channel].append(messageData)
    messageData['deletedMessage'] = False
    # If over 100 messages, delete the first one:
    if (channelMessageCount >= 100):
        del channelList[channel][0]
        messageData['deletedMessage'] = True
    print(f'Channel: {channel} with {channelMessageCount} messages received {myMessage} at {timeSent} by {user}')
    # To tell everyone a message was received
    emit('message received', messageData, broadcast=True)

@socketio.on('delete message')
def deleteMessage(data):
    user = data['user']
    channel = data['channel']
    timestamp = data['timestamp']
    # If timestamp and user match, then delete
    for message in channelList[channel]:
        if message['user'] == user and message['timestamp'] == timestamp:
            print(f"Deleted {message}")
            channelList[channel].remove(message)
            break
    print(channelList[channel])
    emit('deleted message, data, broadcast=True')
        



# Joining a room
@socketio.on("join")
def joinRoom(roomToJoin):
    print("joining room: " + roomToJoin)
    join_room(roomToJoin)
    currentChannel["initial"] = roomToJoin
    print("current channel: " + currentChannel["initial"])
    emit("join channel", room=roomToJoin)
    print(channelList)
    print(currentChannel)

# Leaving a room
@socketio.on("leave")
def leaveRoom(roomToLeave):
    print("leaving room" + roomToLeave)
    leave_room(roomToLeave)
    emit("leave channel", room=roomToLeave)

if __name__ == '__main__':
    socketio.run(app)

