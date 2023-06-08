import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUserDispatch, useUserState } from "../context/UserContext";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { WS_ENDPOINT } from "../lib/api";
import wolf from "../img/wolf.png";
import seer from "../img/seer.png";
import villager from "../img/villager.png";
import { MdOutlineContentCopy } from "react-icons/md";
import { ImExit } from "react-icons/im";
import { useState } from "react";
import Timer from "../components/Timer"
import GameResult from '../components/GameResult'; 
import { BsPeopleFill, BsFillPersonFill } from "react-icons/bs";
import { GiWolfHowl } from "react-icons/gi";
import { FaRegEye } from "react-icons/fa";

let stompClient = null;
function Room() {
  /********************************************
   VARIABLE
   *********************************************/
  const roomId = useParams().roomId;
  const user = useUserState();
  const userDispatch = useUserDispatch();
  const navigate = useNavigate();

  /********************************************
   STATE
   *********************************************/
  const [publicChats, setPublicChats] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [tab, setTab] = useState("PUBLIC");
  const [isGameResultVisible, setIsGameResultVisible] = useState(false);
  const [gameWinner, setGameWinner] = useState(null);
  const [roomData, setRoomData] = useState({
    id: "",
    status: "",
    host: null,
    players: [],
    phase: "",
  });
  const [messageData, setMessageData] = useState({
    senderName: "",
    message: "",
  });
  const [remainingTime, setRemainingTime] = useState(0);

  /********************************************
   CALLBACK
   *********************************************/
  useEffect(() => {
    connectWebSocket();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleBeforeUnload = (e) => {
    e.preventDefault();
    const message =
      "Are you sure you want to leave? All provided data will be lost.";
    e.returnValue = message;
    return message;
  };

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
    subscribePrivateChat(user.role);
    getRoomInfo();
    subscribeTimer(roomData.phase);
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

    if (user != null) {
      const msgData = {
        senderName: "System",
        message: user.username + " join the room",
      };
      sendPublicMsg(msgData);
    }
  }

  function subscribePrivateChat(role) {
    if (role !== "Villager") {
      if (stompClient.connected) {
        stompClient.subscribe(
          `/chat/${roomId}-${role}/private`,
          handlePrivateMessage
        );
      }
    }
  }

  function subscribeTimer(phase) {
    phase = "night"; //for testing purpose
    if (stompClient && stompClient.connected) {
      stompClient.subscribe(`/timer/${roomId}/${phase}`, handleTimerPayload, (error) => {
        console.error('Failed to subscribe:', error);
      });
    }
  };

  function handleTimerPayload(message) {
    try {
      if (message.body) {
        setRemainingTime(parseInt(message.body));
      }
    } catch (error) {
      console.error('Failed to parse message body:', message.body, error);
    }
  };

  function handleRoomPayload(payload) {
    var payloadData = JSON.parse(payload.body);

    const data = {
      id: roomId,
      status: payloadData.status,
      host: payloadData.host,
      players: payloadData.players,
      phase: payloadData.phase,
    };
    setRoomData(data);
    setCurrentUser(payloadData.players);
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
    setMessageData({
      senderName: user.username,
      message: message,
    });
  }

  function sendPublicMsg(messageData) {
    if (messageData.message.trim() !== "") {
      if (stompClient.connected) {
        console.log("messageData", messageData);
        stompClient.send(
          "/ws/send-public-message",
          {},
          JSON.stringify({
            room: { id: roomId },
            message: messageData,
          })
        );
        setMessageData({ ...messageData, message: "" });
      }
    }
  }

  function sendPrivateMsg(messageData) {
    if (messageData.message.trim() !== "") {
      if (stompClient.connected) {
        stompClient.send(
          "/ws/send-private-message",
          {},
          JSON.stringify({
            room: { id: roomId },
            user: user,
            message: messageData,
          })
        );
        setMessageData({ ...messageData, message: "" });
      }
    }
  }

  function setCurrentUser(players) {
    console.log("players", players);
    if (user !== null) {
      const currentUser = players.filter(
        (player) => player !== null && player.id === user.id
      )[0];
      userDispatch({
        type: "SET_USER_DATA",
        payload: currentUser,
      });
    }
  }

  function getRoomInfo() {
    if (stompClient.connected) {
      stompClient.send("/ws/get-room", {}, roomId);
    }
  }

  function startTimer() {
    if (stompClient.connected) {
        let phase = "night"; //for testing purpose
        stompClient.send(`/ws/start-timer`, {},JSON.stringify({
          roomId: roomId,
          phase: phase,
        }));
    }
  }

  function startGame() {
    if (roomData.players.length < 5) {
      alert("Minimum 5 players are needed to start the game.");
    } else {
      if (stompClient.connected) {
        stompClient.send("/ws/start-game", {}, JSON.stringify(roomData));
        startTimer();
      }
    }
  }

  function endGame(winner) {
    startTimer();
    setGameWinner(winner);
    setIsGameResultVisible(true);
  }

  function closeGameResult() {
    setIsGameResultVisible(false);
  }

  function exitRoom() {
    if (window.confirm("Are you sure to exit the room?")) {
      const room = {
        ...roomData,
        exitPlayer: user,
      };
      if (stompClient.connected) {
        stompClient.send("/ws/exit-room", {}, JSON.stringify(room));
      }
      navigate("/");
    }
  }

  function getImage(playerRole) {
    let image = null;

    if (user.role === "Wolf") {
      image = playerRole === "Wolf" ? wolf : villager;
    } else if (user.role === "Seer") {
      image = playerRole === "Seer" ? seer : villager;
    } else {
      image = villager;
    }

    return image;
  }

  console.log("user state", user);
  console.log("room state ", roomData);

  return (
    <div className="bg-[url('/src/img/bg-room-night.jpg')] h-screen bg-no-repeat bg-center bg-cover overflow-y-auto flex flex-row">
      <div className=" flex-auto w-64">
        {/* Players */}
        <div className="grid grid-cols-4 gap-y-2 py-3 px-5 pl-14 max-[1210px]:grid-cols-3">
          {roomData.players.map((player) => {
            if (player != null) {
              return (
                <div key={player.id}>
                  <div className="card w-36 py-2 shadow-xl bg-black bg-opacity-60 min-[1800px]:w-44 min-[1900px]:w-48 max-[1480px]:w-36 max-[1210px]:w-30 ">
                    <figure>
                      <img
                        src={getImage(player.role)}
                        alt="Wolf"
                        className="w-32 min-[1800px]:w-44"
                      />
                    </figure>
                    <div></div>
                  </div>
                  <div
                    className={`badge badge-error  w-fit mr-8 mt-2 font-bold min-[2000px]:mr-16`}
                  >
                    {player.username}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
      <div className="flex-auto w-32 flex flex-col h-full">
        {/* Room Details */}
        <div className="flex-auto h-48 pr-8 pt-5 pb-2 flex flex-col">
          <div className="bg-black bg-opacity-70 border-gray-500 border-solid border-2 w-full h-full rounded-2xl shadow-2xl text-white flex flex-col justify-between pb-3">
            {/* Top */}
            <div className=" w-full h-1/6 flex justify-between px-7 items-center border-b-2 border-white ">
              {/* Room ID */}
              <div className="flex h-1/6 items-center ">
                <h1 className="text-lg">
                  <span className="font-semibold ">Room ID:</span> {roomId}
                </h1>
                {roomData.status !== "STARTED" && (
                  <MdOutlineContentCopy
                    title="Copy room id to clipboard"
                    className="text-xl ml-3 cursor-pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(roomId);
                      alert("Copied to clipboard");
                    }}
                  />
                )}
              </div>

              <div className="flex items-center text-xl mr-5 ">
                <BsPeopleFill />
                <p className="ml-3">{roomData.players.length}/16</p>
              </div>
              <div className=" flex flex-auto h-full items-center justify-end">
              <button onClick={() => endGame('Villager')}>End Game</button>
                <GameResult winner={gameWinner} isVisible={isGameResultVisible} close={closeGameResult}/>
              </div>
              {/* this timer for testing purpose*/}
              <Timer remainingTime={remainingTime} />
              {/* Exit Room button */}
              {roomData.status !== "STARTED" && (
                <div
                  className="flex items-center text-xl cursor-pointer hover:text-red-500"
                  onClick={exitRoom}
                >
                  <ImExit title="Exit the room" className="mr-3 mt-1" />
                  <p>Exit</p>
                </div>
              )}
            </div>

            {/* Middle */}
            <div className="text-2xl text-green-400 h-1/6 w-full flex ">
              {roomData.status === "STARTED" ? (
                <h1 className="m-auto">Discussions in 30s...</h1>
                
              ) : (
                <h1 className="m-auto">
                  Still waiting for other players to join...
                </h1>
              )}
            </div>
            {roomData.status === "STARTED" && (
              <div className="flex flex-col w-full">
                <div className="flex text-6xl mx-auto justify-evenly w-10/12 ">
                  <GiWolfHowl />
                  <FaRegEye />
                  <BsFillPersonFill />
                </div>

                <div className="mx-auto w-10/12 h-2/3 mt-2 ">
                  <div className="flex flex-col m-auto w-fit text-lg text-left mt-3">
                    <p>
                      <b>Role:</b> Wolf
                    </p>
                    <p>
                      <b>Action:</b> Each night you can select a player to
                      reveal their role.
                    </p>
                    <p>
                      <b>Team:</b> Village
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom */}
            <div className="w-full h-1/6 px-5  flex justify-end items-center">
              {roomData.host != null &&
                user.id === roomData.host.id &&
                roomData.status !== "STARTED" && (
                  <button
                    onClick={startGame}
                    className="btn bg-red-500 border-white "
                  >
                    Start Game
                  </button>
                )}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex-auto h-52 pb-10 pt-2 pr-8">
          <div className="bg-black bg-opacity-70 border-gray-500 border-solid border-2 w-full h-full rounded-2xl shadow-2xl flex flex-col">
            {/* Tab */}
            <div
              className={`btn-group grid ${
                roomData.status === "STARTED" && user.role !== "Villager"
                  ? "grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              <button
                className={`btn btn-outline text-white ${
                  tab === "PRIVATE" && "bg-gray-300 bg-opacity-30"
                }`}
                onClick={() => setTab("PUBLIC")}
              >
                Public
              </button>
              {roomData.status === "STARTED" && user.role !== "Villager" ? (
                <button
                  className={`btn btn-outline text-white ${
                    tab === "PUBLIC" && "bg-gray-300 bg-opacity-30"
                  }`}
                  onClick={() => setTab("PRIVATE")}
                >
                  Private ({user.role})
                </button>
              ) : null}
            </div>

            {/* Chat Content and Send button */}
            {tab === "PUBLIC" ? (
              <>
                <div className="h-full p-5 text-white text-left overflow-y-auto">
                  {publicChats.map((msg, index) => {
                    return (
                      <p
                        key={index}
                        className={`text-lg ${
                          msg.senderName === "System"
                            ? "text-red-400"
                            : "text-green-300"
                        }`}
                      >
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
                      onClick={() => sendPublicMsg(messageData)}
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
                      <p key={index} className="text-lg text-green-300">
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
                      onClick={() => sendPrivateMsg(messageData)}
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
