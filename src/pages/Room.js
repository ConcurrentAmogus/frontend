import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUserState } from "../context/UserContext";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { WS_ENDPOINT } from "../lib/api";
import wolf from "../img/wolf.png";
import seer from "../img/seer.png";
import villager from "../img/villager.png";
import { MdOutlineContentCopy } from "react-icons/md";
import { ImExit } from "react-icons/im";
import { useState } from "react";

let stompClient = null;
function Room() {
  const roomId = useParams().roomId;
  const user = useUserState();
  const navigate = useNavigate();

  const [publicChats, setPublicChats] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [roomData, setRoomData] = useState({
    id: "",
    status: "",
  });
  const [messageData, setMessageData] = useState({
    senderName: "",
    message: "",
  });
  const [tab, setTab] = useState("PUBLIC");

  // dummy data
  const players = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const messages = [
    {
      senderName: "ys",
      message: "Jom vote Alex",
      color: "red",
    },
    {
      senderName: "Alex",
      message: "Don't vote me, I'm a villager only",
      color: "blue",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "green",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "red",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "gray",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "purple",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "yellow",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "red",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "red",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "red",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "red",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "red",
    },
    {
      senderName: "Annonymous",
      message: "Who are the wolves?",
      color: "red",
    },
  ];
  const role = "Wolf";

  useEffect(() => {
    connectWebSocket();
  }, []);

  // WebSocket connection
  function connectWebSocket() {
    const socket = new SockJS(WS_ENDPOINT);
    stompClient = Stomp.over(socket);
    stompClient.connect({}, handleConnect, handleError);
  }

  function handleConnect() {
    console.log("Connected to the WebSocket");
    setRoomData({ ...roomData, id: roomId });
    subscribeRoom();
    subscribePublicChat();
    // only subscribe if gt special role (Wolf / Seer)
    if (role !== "Villager") {
      subscribePrivateChat();
    }
  }

  function handleError(err) {
    alert("Error in connecting WebSocket ", err);
  }

  function subscribeRoom() {
    if (stompClient.connected) {
      stompClient.subscribe(`/room/${roomId}`, handleRoomPayload);
    }
  }

  function subscribePublicChat() {
    if (stompClient.connected) {
      stompClient.subscribe(`/chat/${roomId}/public`, handlePublicMessage);
    }
  }

  function subscribePrivateChat() {
    if (stompClient.connected) {
      stompClient.subscribe(
        `/chat/${roomId}-${role}/private`,
        handlePrivateMessage
      );
    }
  }

  function handleRoomPayload(payload) {
    var payloadData = JSON.parse(payload.body);

    setRoomData({ id: roomId, status: payloadData.status });
  }

  function handlePublicMessage(payload) {
    var payloadData = JSON.parse(payload.body);

    publicChats.push(payloadData);
    setPublicChats([...publicChats]);
  }

  function handlePrivateMessage(payload) {
    var payloadData = JSON.parse(payload.body);

    privateChats.push(payloadData);
    setPrivateChats([...privateChats]);
  }

  function handleSendMessage(message) {
    console.log("user send", user);
    setMessageData({
      senderName: user.username,
      message: message,
    });
  }

  function sendPublicMsg() {
    if (stompClient) {
      stompClient.send(
        "/ws/send-public-message",
        {},
        JSON.stringify({
          room: roomData,
          message: messageData,
        })
      );
      setMessageData({ ...messageData, message: "" });
    }
  }

  function sendPrivateMsg() {
    if (stompClient) {
      stompClient.send(
        "/ws/send-private-message",
        {},
        JSON.stringify({
          room: roomData,
          user: {
            id: user.id,
            username: user.username,
            role: role,
          },
          message: messageData,
        })
      );
      setMessageData({ ...messageData, message: "" });
    }
  }

  function exitRoom() {
    if (window.confirm("Are you sure to exit the room?")) {
      navigate("/");
    }
  }

  return (
    <div className="bg-[url('/src/img/bg-room-night.jpg')] h-screen bg-no-repeat bg-center bg-cover flex flex-row">
      <div className=" flex-auto w-64">
        {/* Players */}
        <div className="grid grid-cols-4 gap-y-2 py-5 px-5 pl-14 min-[2000px]:py-10">
          {players.map((player) => {
            return (
              <div key={player}>
                <div className="card w-44 py-2 shadow-xl bg-white bg-opacity-60 min-[1800px]:w-44 min-[2000px]:w-48  ">
                  <figure>
                    <img
                      src={wolf}
                      alt="Wolf"
                      className="w-36 min-[2000px]:w-48"
                    />
                  </figure>
                  <div></div>
                </div>
                <div className="badge badge-error w-fit mr-8 mt-2 font-bold min-[2000px]:mr-16">
                  1
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-auto w-32 flex flex-col h-full">
        {/* Room Details */}
        <div className="flex-auto h-60 pr-8 pt-5 pb-2 flex flex-col">
          <div className="bg-black bg-opacity-70 border-gray-500 border-solid border-2 w-full h-full rounded-2xl shadow-2xl text-white flex flex-col">
            <div className=" w-full h-20 flex px-7 items-center border-b-2 border-white">
              <div className="flex h-full items-center">
                <h1 className="text-2xl">
                  <span className="font-bold ">Room ID:</span> {roomId}
                </h1>
                <MdOutlineContentCopy
                  title="Copy room id"
                  className="text-xl ml-5 cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(roomId);
                    alert("Copied room id");
                  }}
                />
              </div>
              <div className=" flex flex-auto h-full items-center justify-end">
                <ImExit
                  title="Exit the room"
                  className="text-xl cursor-pointer hover:text-red-500"
                  onClick={exitRoom}
                />
              </div>
            </div>
            <div className="w-full h-20 flex justify-between items-center px-8 text-2xl">
              <p>Night 1</p>
              <p>00:07</p>
              <p>9/10</p>
            </div>
            <div className="w-full h-full relative ">
              <button className="btn bg-red-500 border-white absolute right-5 bottom-5">
                Start Game
              </button>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-auto h-40 pb-10 pt-2 pr-8">
          <div className="bg-black bg-opacity-70 border-gray-500 border-solid border-2 w-full h-full rounded-2xl shadow-2xl flex flex-col">
            <div className="btn-group grid grid-cols-2">
              <button
                className={`btn btn-outline text-white ${
                  tab === "PRIVATE" && "bg-gray-300 bg-opacity-30"
                }`}
                onClick={() => setTab("PUBLIC")}
              >
                Public
              </button>
              <button
                className={`btn btn-outline text-white ${
                  tab === "PUBLIC" && "bg-gray-300 bg-opacity-30"
                }`}
                onClick={() => setTab("PRIVATE")}
              >
                Private (Wolf)
              </button>
            </div>

            {tab === "PUBLIC" ? (
              <>
                <div className="h-full p-5 text-white text-left overflow-y-auto">
                  {publicChats.map((msg, index) => {
                    return (
                      <p key={index} className="text-lg text-red-300">
                        [{msg.senderName}]: {msg.message}
                      </p>
                    );
                  })}
                </div>

                <div className="h-20">
                  <div className="input-group m-auto px-3 pb-2">
                    <input
                      type="text"
                      placeholder="Public Chat..."
                      className="input input-bordered w-full bg-gray-800 text-white"
                      value={messageData.message}
                      onChange={(e) => handleSendMessage(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-square bg-green-700 w-20"
                      onClick={sendPublicMsg}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="h-full p-5 text-white text-left overflow-y-auto">
                  {privateChats.map((msg, index) => {
                    return (
                      <p key={index} className="text-lg text-red-300">
                        [{msg.senderName}]: {msg.message}
                      </p>
                    );
                  })}
                </div>

                <div className="h-20">
                  <div className="input-group m-auto px-3 pb-2">
                    <input
                      type="text"
                      placeholder="Private Chat..."
                      className="input input-bordered w-full bg-gray-800 text-white"
                      value={messageData.message}
                      onChange={(e) => handleSendMessage(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-square bg-green-700 w-20"
                      onClick={sendPrivateMsg}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Room;
