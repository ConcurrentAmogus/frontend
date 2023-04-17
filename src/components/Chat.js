import React from "react";
import { useState } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";

let stompClient = null;
function Chat() {
  console.log("StompClient", stompClient);
  const [userData, setUserData] = useState({
    username: "",
    receiverName: "",
    message: "",
    connected: false,
  });
  const [publicChats, setPublicChats] = useState([]);
  const [privateChats, setPrivateChats] = useState(new Map());
  const [tab, setTab] = useState("CHATROOM");

  const handleUsername = (name) => {
    setUserData({ ...userData, username: name });
  };

  const register = () => {
    connectWS();
  };

  const connectWS = () => {
    const socket = new SockJS("http://localhost:8080/ws");
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, onError);
  };

  const onConnected = () => {
    setUserData({ ...userData, connected: true });
    stompClient.subscribe("/chatroom/public", handlePublicMessage);
    stompClient.subscribe(
      `/user/${userData.username}/private`,
      handlePrivateMessage
    );
    userJoinPublic();
  };

  const handlePublicMessage = (payload) => {
    var payloadData = JSON.parse(payload.body);
    console.log("payloadData", payloadData);

    switch (payloadData.status) {
      case "JOIN":
        if (!privateChats.get(payloadData.senderName)) {
          privateChats.set(payloadData.senderName, []);
          setPrivateChats(new Map(privateChats));
        }
        break;

      case "MESSAGE":
        publicChats.push(payloadData);
        setPublicChats([...publicChats]);
        break;
    }
  };

  const handlePrivateMessage = (payload) => {
    var payloadData = JSON.parse(payload.body);
    if (privateChats.get(payloadData.senderName)) {
      privateChats.get(payloadData.senderName).push(payloadData);
      setPrivateChats(new Map(privateChats));
    } else {
      let list = [];
      list.push(payloadData);
      privateChats.set(payloadData.senderName, list);
      setPrivateChats(new Map(privateChats));
    }
  };

  const userJoinPublic = () => {
    var chatMessage = {
      senderName: userData.username,
      status: "JOIN",
    };
    stompClient.send(
      "/app/public-message-example",
      {},
      JSON.stringify(chatMessage)
    );
  };

  const onError = (err) => {
    console.log(err);
  };

  const handleMessage = (msg) => {
    setUserData({ ...userData, message: msg });
  };

  const sendPublicMsg = () => {
    if (stompClient) {
      var chatMessage = {
        senderName: userData.username,
        message: userData.message,
        status: "MESSAGE",
      };
      stompClient.send(
        "/app/public-message-example",
        {},
        JSON.stringify(chatMessage)
      );
      setUserData({ ...userData, message: "" });
    }
  };

  const sendPrivateMsg = () => {
    if (stompClient) {
      var chatMessage = {
        senderName: userData.username,
        receiverName: tab,
        message: userData.message,
        status: "MESSAGE",
      };

      if (userData.username !== tab) {
        privateChats.get(tab).push(chatMessage);
        setPrivateChats(new Map(privateChats));
      }
      stompClient.send(
        "/app/private-message-example",
        {},
        JSON.stringify(chatMessage)
      );
      setUserData({ ...userData, message: "" });
    }
  };

  console.log("public chat", publicChats);

  return (
    <div className="container">
      {userData.connected ? (
        <div className="chat-box">
          <div className="member-list">
            <ul>
              <li
                onClick={() => {
                  setTab("CHATROOM");
                }}
                className={`member ${tab === "CHATROOM" && "active"}`}
              >
                Chatroom
              </li>
              {[...privateChats.keys()].map((name, index) => {
                if (name !== userData.username) {
                  return (
                    <li
                      onClick={() => {
                        setTab(name);
                      }}
                      className={`member ${tab === name && "active"}`}
                      key={index}
                    >
                      {name}
                    </li>
                  );
                }
              })}
            </ul>
          </div>
          {tab === "CHATROOM" && (
            <div className="chat-content">
              <ul className="chat-messages">
                {publicChats.map((chat, index) => (
                  <li
                    className={`message ${
                      chat.senderName === userData.username && "self"
                    }`}
                    key={index}
                  >
                    {chat.senderName !== userData.username && (
                      <div className="avatar">{chat.senderName}</div>
                    )}
                    <div className="message-data">{chat.message}</div>
                    {chat.senderName === userData.username && (
                      <div className="avatar self">{chat.senderName}</div>
                    )}
                  </li>
                ))}
              </ul>

              <div className="send-message">
                <input
                  type="text"
                  className="input-message"
                  placeholder="enter the message"
                  value={userData.message}
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
          {tab !== "CHATROOM" && (
            <div className="chat-content">
              <ul className="chat-messages">
                {[...privateChats.get(tab)].map((chat, index) => (
                  <li
                    className={`message ${
                      chat.senderName === userData.username && "self"
                    }`}
                    key={index}
                  >
                    {chat.senderName !== userData.username && (
                      <div className="avatar">{chat.senderName}</div>
                    )}
                    <div className="message-data">{chat.message}</div>
                    {chat.senderName === userData.username && (
                      <div className="avatar self">{chat.senderName}</div>
                    )}
                  </li>
                ))}
              </ul>

              <div className="send-message">
                <input
                  type="text"
                  className="input-message"
                  placeholder="enter the message"
                  value={userData.message}
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
          <h1>Register first</h1>
          <input
            type="text"
            placeholder="Enter your name"
            value={userData.username}
            onChange={(e) => handleUsername(e.target.value)}
          />
          <button type="button" onClick={register}>
            Register
          </button>
        </div>
      )}
    </div>
  );
}

export default Chat;
