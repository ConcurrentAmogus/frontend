import React, { useState } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";

let stompClient = null;
function TestChat() {
  const [roomData, setRoomData] = useState({
    roomId: "",
    status: "",
  });
  const [playerData, setPlayerData] = useState({
    username: "",
    role: "",
    login: false,
  });
  const [messageData, setMessageData] = useState({
    senderName: "",
    message: "",
    time: "",
  });
  const [publicChats, setPublicChats] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [tab, setTab] = useState("PUBLIC");

  const handleLogin = () => {
    const socket = new SockJS("http://localhost:8080/ws2");
    stompClient = Stomp.over(socket);
    stompClient.connect({}, handleConnect, handleError);
  };

  const handleConnect = () => {
    setRoomData({ ...roomData, status: "WAITING" });
    setPlayerData({ ...playerData, login: true });
    stompClient.subscribe(`/room/${roomData.roomId}`, handleRoomPayload);
    stompClient.subscribe(
      `/chat/${roomData.roomId}/public`,
      handlePublicMessage
    );
    if (playerData.role !== "Villager") {
      stompClient.subscribe(
        `/chat/${roomData.roomId}-${playerData.role}/private`,
        handlePrivateMessage
      );
    }
    updateGameRoom();
  };

  const handleError = (err) => {
    alert(err);
  };

  const handleRoomPayload = (payload) => {
    var payloadData = JSON.parse(payload.body);

    switch (payloadData.status) {
      case "START":
        console.log("The game is started");
        break;

      case "WAITING":
        console.log("Still waiting for other players");
        break;

      case "END":
        console.log("The game is ended");
        break;

      default:
        console.log("Null");
        break;
    }
  };

  const handlePublicMessage = (payload) => {
    var payloadData = JSON.parse(payload.body);

    publicChats.push(payloadData);
    setPublicChats([...publicChats]);
  };

  const handlePrivateMessage = (payload) => {
    var payloadData = JSON.parse(payload.body);

    privateChats.push(payloadData);
    setPrivateChats([...privateChats]);
  };

  const updateGameRoom = () => {
    var roomInfo = {
      roomId: roomData.roomId,
      status: "WAITING",
    };
    stompClient.send("/app/update-room", {}, JSON.stringify(roomInfo));
  };

  const handleMessage = (message) => {
    setMessageData({
      senderName: playerData.username,
      message: message,
      time: "now",
    });
  };

  const sendPublicMsg = () => {
    if (stompClient) {
      stompClient.send(
        "/app/public-message",
        {},
        JSON.stringify({ room: roomData, message: messageData })
      );
      setMessageData({
        ...messageData,
        message: "",
        time: "",
      });
    }
  };

  const sendPrivateMsg = () => {
    if (stompClient) {
      stompClient.send(
        "/app/private-message",
        {},
        JSON.stringify({
          room: roomData,
          player: playerData,
          message: messageData,
        })
      );
      setMessageData({
        ...messageData,
        message: "",
        time: "",
      });
    }
  };

  return (
    <div>
      {playerData.login ? (
        <div className="chat-box">
          <div className="member-list">
            <ul>
              <li
                onClick={() => {
                  setTab("PUBLIC");
                }}
                className={`member ${tab === "PUBLIC" && "active"}`}
              >
                Public Chatroom
              </li>
              {playerData.role !== "Villager" ? (
                <li
                  onClick={() => {
                    setTab("PRIVATE");
                  }}
                  className={`member ${tab === "PRIVATE" && "active"}`}
                >
                  {playerData.role} Chatroom
                </li>
              ) : null}
            </ul>
          </div>
          {tab === "PUBLIC" && (
            <div className="chat-content">
              <ul className="chat-messages">
                {publicChats.map((chat, index) => (
                  <li
                    className={`message ${
                      chat.senderName === playerData.username && "self"
                    }`}
                    key={index}
                  >
                    {chat.senderName !== playerData.username && (
                      <div className="avatar">{chat.senderName}</div>
                    )}
                    <div className="message-data">{chat.message}</div>
                    {chat.senderName === playerData.username && (
                      <div className="avatar self">{chat.senderName}</div>
                    )}
                  </li>
                ))}
              </ul>

              <div className="send-message">
                <input
                  type="text"
                  className="input-message"
                  placeholder="Enter the message"
                  value={messageData.message}
                  onChange={(e) => handleMessage(e.target.value)}
                />
                <button
                  type="button"
                  className="send-button"
                  onClick={sendPublicMsg}
                >
                  Send
                </button>
              </div>
            </div>
          )}
          {tab === "PRIVATE" && (
            <div className="chat-content">
              <ul className="chat-messages">
                {privateChats.map((chat, index) => (
                  <li
                    className={`message ${
                      chat.senderName === playerData.username && "self"
                    }`}
                    key={index}
                  >
                    {chat.senderName !== playerData.username && (
                      <div className="avatar">{chat.senderName}</div>
                    )}
                    <div className="message-data">{chat.message}</div>
                    {chat.senderName === playerData.username && (
                      <div className="avatar self">{chat.senderName}</div>
                    )}
                  </li>
                ))}
              </ul>

              <div className="send-message">
                <input
                  type="text"
                  className="input-message"
                  placeholder="Enter the message"
                  value={messageData.message}
                  onChange={(e) => handleMessage(e.target.value)}
                />
                <button
                  type="button"
                  className="send-button"
                  onClick={sendPrivateMsg}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Enter username"
            value={playerData.username}
            onChange={(e) =>
              setPlayerData({ ...playerData, username: e.target.value })
            }
          />
          <select
            placeholder="Enter role"
            value={playerData.role}
            onChange={(e) =>
              setPlayerData({ ...playerData, role: e.target.value })
            }
          >
            <option value="">Role</option>
            <option value="Villager">Villager</option>
            <option value="Hunter">Hunter</option>
            <option value="Seer">Seer</option>
          </select>
          <input
            type="text"
            placeholder="Enter room id"
            value={roomData.roomId}
            onChange={(e) =>
              setRoomData({ ...roomData, roomId: e.target.value })
            }
          />
          <button type="button" onClick={handleLogin}>
            Login
          </button>
        </div>
      )}
    </div>
  );
}

export default TestChat;
