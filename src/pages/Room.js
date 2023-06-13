import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUserDispatch, useUserState } from "../context/UserContext";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { WS_ENDPOINT } from "../lib/api";
import wolf from "../img/wolf.png";
import seer from "../img/seer.png";
import villager from "../img/villager.png";
import grave from "../img/grave.png";
import { MdOutlineContentCopy, MdOutlineTimer } from "react-icons/md";
import { ImExit } from "react-icons/im";
import { useState } from "react";
import Timer from "../components/Timer";
import GameResult from "../components/GameResult";
import { BsPeopleFill, BsFillPersonFill } from "react-icons/bs";
import { GiWolfHowl } from "react-icons/gi";
import { FaRegEye } from "react-icons/fa";
import Screen from "../components/Screen";

let stompClient = null;
function Room() {
  /********************************************
   VARIABLE
   *********************************************/
  const roomId = useParams().roomId;
  const user = useUserState();
  const userDispatch = useUserDispatch();
  const navigate = useNavigate();
  const description = [
    {
      role: "Wolf",
      action: "Each night you can choose a player to kill",
      team: "Bad",
    },
    {
      role: "Seer",
      action: "Each night you can reveal a player's role",
      team: "Good",
    },
    {
      role: "Villager",
      action: "Each day all villagers need to vote a player to find the wolf",
      team: "Good",
    },
  ];

  /********************************************
   STATE
   *********************************************/
  const [publicChats, setPublicChats] = useState([]);
  const [privateChats, setPrivateChats] = useState([]);
  const [tab, setTab] = useState("PUBLIC");
  const [copied, setCopied] = useState(false);
  const [isGameResultVisible, setIsGameResultVisible] = useState(false);
  const [gameWinner, setGameWinner] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [roleDescription, setRoleDescription] = useState(0);
  const [roomData, setRoomData] = useState({
    id: "",
    status: "",
    host: null,
    players: [],
    phase: "",
    winner: "",
  });
  const [messageData, setMessageData] = useState({
    senderName: "",
    message: "",
  });
  const [voteData, setVoteData] = useState({
    roomId: "",
    votePlayer: null,
    selectedPlayer: null,
    killedPlayer: null,
    revealedRolePlayer: null,
    message: "",
    votes: null,
    gameEnded: false,
  });
  const [remainingTime, setRemainingTime] = useState(0);

  const [publicChatsSub, setPublicChatsSub] = useState(false);

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

  useEffect(() => {
    subscribeNightVote(user.role);
    subscribePrivateChat(user.role);
  }, [user.role]);

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
    subscribeTimer();
    subscribeDayVote();
    subscribePublicChat();

    getRoomInfo();
  }

  function handleError(err) {
    console.log("Error in connecting WebSocket ", err);
    console.log("Trying to reconnect...");
    connectWebSocket();
  }

  function subscribeRoom() {
    if (stompClient.connected) {
      stompClient.subscribe(`/room/${roomId}`, handleRoomPayload);
    }
  }

  function subscribeTimer() {
    // phase = "night"; //for testing purpose
    if (stompClient && stompClient.connected) {
      stompClient.subscribe(`/timer/${roomId}`, handleTimerPayload, (error) => {
        console.error("Failed to subscribe:", error);
      });
    }
  }

  function subscribePublicChat() {
    if (stompClient.connected && !publicChatsSub) {
      stompClient.subscribe(`/chat/${roomId}/public`, handlePublicMessage);
      setPublicChatsSub(true);
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

  function subscribeDayVote() {
    if (stompClient.connected) {
      stompClient.subscribe(`/vote/${roomId}/day`, handleVotePayload);
    }
  }

  function subscribeNightVote(role) {
    if (role !== "Villager") {
      if (stompClient.connected) {
        stompClient.subscribe(
          `/vote/${roomId}-${role}/night`,
          handleVotePayload
        );
      }
    }
  }

  function getRoomInfo() {
    if (stompClient.connected) {
      stompClient.send("/ws/get-room", {}, roomId);
    }
  }

  function handleTimerPayload(message) {
    try {
      if (message.body) {
        setRemainingTime(parseInt(message.body));
      }
    } catch (error) {
      console.error("Failed to parse message body:", message.body, error);
    }
  }

  function handleRoomPayload(payload) {
    var payloadData = JSON.parse(payload.body);

    const data = {
      id: roomId,
      status: payloadData.status,
      host: payloadData.host,
      players: payloadData.players,
      phase: payloadData.phase,
      winner: payloadData.winner,
    };
    setRoomData(data);
    setCurrentUser(payloadData.players);

    if (payloadData.winner !== null) {
      setIsGameResultVisible(true);
    }
  }

  function handlePublicMessage(payload) {
    var payloadData = JSON.parse(payload.body);

    const last = publicChats.length
      ? publicChats[publicChats.length - 1]
      : { message: "" };
    if (payloadData.message !== last.message) {
      publicChats.push(payloadData);
      setPublicChats([...publicChats]);
    }
  }

  function handlePrivateMessage(payload) {
    var payloadData = JSON.parse(payload.body);

    const last = privateChats.length
      ? privateChats[privateChats.length - 1]
      : { message: "" };
    if (payloadData.message !== last.message) {
      privateChats.push(payloadData);
      setPrivateChats([...privateChats]);
    }
  }

  function handleVotePayload(payload) {
    var payloadData = JSON.parse(payload.body);

    const data = {
      roomId: payloadData.roomId,
      votes: payloadData.votes,
      gameEnded: payloadData.gameEnded,
      message: payloadData.message,
      killedPlayer: payloadData.killedPlayer,
      revealedRolePlayer: payloadData.revealedRolePlayer,
    };
    setVoteData(data);

    if (payloadData.killedPlayer !== null) {
      sendPublicMsg({ senderName: "System", message: payloadData.message });
    } else if (payloadData.revealedRolePlayer !== null) {
      sendPrivateMsg({ senderName: "System", message: payloadData.message });
    } else if (
      payloadData.killedPlayer === null &&
      payloadData.revealedRolePlayer === null
    ) {
      sendPublicMsg({ senderName: "System", message: payloadData.message });
    }
  }

  function handleSendMessage(message) {
    setMessageData({
      senderName: user.username,
      message: message,
    });
  }

  function sendPublicMsg(msgData) {
    if (msgData.message !== null && msgData.message.trim() !== "") {
      if (stompClient.connected) {
        console.log("msgData", msgData);
        stompClient.send(
          "/ws/send-public-message",
          {},
          JSON.stringify({
            room: { id: roomId },
            message: msgData,
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

  function startTimer(phase) {
    if (stompClient.connected) {
      stompClient.send(
        `/ws/start-timer`,
        {},
        JSON.stringify({
          roomId: roomId,
          phase: phase,
        })
      );
    }
  }

  async function startGame() {
    if (roomData.players.length < 5) {
      alert("Minimum 5 players are needed to start the game");
    } else {
      if (stompClient.connected) {
        stompClient.send("/ws/start-game", {}, JSON.stringify(roomData));
      }
    }
  }

  function closeGameResult() {
    setIsGameResultVisible(false);
    userDispatch({
      type: "SET_USER_DATA",
      payload: null,
    });
    navigate("/");
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
      if (user != null) {
        const msgData = {
          senderName: "System",
          message: user.username + " exit the room",
        };
        sendPublicMsg(msgData);
      }
      userDispatch({
        type: "SET_USER_DATA",
        payload: null,
      });
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

  function handleNightVotePlayer(player) {
    if (
      player.id !== user.id &&
      user.alive &&
      player.role !== user.role &&
      player.alive
    ) {
      if (stompClient.connected) {
        stompClient.send(
          "/ws/vote-night",
          {},
          JSON.stringify({
            roomId: roomId,
            votePlayer: user,
            selectedPlayer: player,
            votes: voteData.votes,
          })
        );
      }
    }
  }

  function handleDayVotePlayer(player) {
    if (player.id !== user.id && user.alive && player.alive) {
      if (stompClient.connected) {
        stompClient.send(
          "/ws/vote-day",
          {},
          JSON.stringify({
            roomId: roomId,
            votePlayer: user,
            selectedPlayer: player,
            votes: voteData.votes,
          })
        );
      }
    }
  }

  console.log("user state", user);
  console.log("room state ", roomData);
  console.log("vote state ", voteData);

  return (
    <div
      className={`${
        roomData.phase === "night"
          ? "bg-[url('/src/img/bg-room-night.jpg')]"
          : roomData.phase === "day"
          ? "bg-[url('/src/img/bg-room-day.png')]"
          : "bg-[url('/src/img/bg-room-evening.png')]"
      } h-screen bg-no-repeat bg-center bg-cover overflow-y-auto flex flex-row`}
    >
      {roomData.status === "STARTING" && remainingTime > 0 ? (
        <Screen msg={`Starting game in ${remainingTime / 1000}s...`} />
      ) : null}
      <div className=" flex-auto w-64">
        {/* Players */}
        <div className="grid grid-cols-4 gap-y-2 py-3 px-5 pl-14 max-[1210px]:grid-cols-3 max-[700px]:grid-cols-2">
          {roomData.players.map((player) => {
            if (player != null) {
              if (roomData.status !== "STARTED") {
                return (
                  <div key={player.id}>
                    <div className="card w-36 py-2 shadow-xl bg-black bg-opacity-60 min-[1800px]:w-44 min-[1900px]:w-48 max-[1480px]:w-36 max-[1210px]:w-30 max-[1000px]:w-28">
                      <figure>
                        <img
                          src={getImage(player.role)}
                          alt="Role"
                          className="w-32 min-[1800px]:w-44"
                        />
                      </figure>
                      <div></div>
                    </div>
                    <div
                      className={`badge ${
                        user.id === player.id ? "badge-error" : "badge-success"
                      } w-fit text-lg font-bold mr-8 mt-2 min-[2000px]:mr-16`}
                    >
                      {player.number} {player.username}
                    </div>
                  </div>
                );
              } else {
                if (roomData.phase === "night") {
                  return (
                    <div key={player.id}>
                      <div
                        className={`relative card w-36 py-2 shadow-xl bg-black bg-opacity-60 min-[1800px]:w-44 min-[1900px]:w-48 max-[1480px]:w-36 max-[1210px]:w-30 max-[1000px]:w-28 ${
                          user.role !== "Villager" &&
                          user.role !== player.role &&
                          player.id !== user.id &&
                          player.alive
                            ? "cursor-pointer hover:bg-gray-300 hover:scale-105 hover:bg-opacity-70 ease-in duration-200"
                            : ""
                        } `}
                        onClick={() => handleNightVotePlayer(player)}
                      >
                        <figure>
                          <img
                            src={player.alive ? getImage(player.role) : grave}
                            alt="Role"
                            className="w-32 min-[1800px]:w-44"
                          />
                        </figure>
                        {voteData.votes !== null &&
                        voteData.votes[player.number] !== undefined &&
                        user.role !== "Villager" &&
                        user.role === player.role ? (
                          <div className="badge badge-warning absolute bottom-3 right-2 font-bold">
                            Vote {voteData.votes[player.number]}
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={`badge ${
                          user.id === player.id
                            ? "badge-error"
                            : "badge-success"
                        } w-fit mr-8 mt-2 font-bold min-[2000px]:mr-16`}
                      >
                        {player.number} {player.username}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={player.id}>
                      <div
                        className={`card w-36 py-2 shadow-xl bg-black bg-opacity-60 min-[1800px]:w-44 min-[1900px]:w-48 max-[1480px]:w-36 max-[1210px]:w-30 max-[1000px]:w-28 ${
                          player.id !== user.id && player.alive
                            ? "cursor-pointer hover:bg-gray-300 hover:scale-105 hover:bg-opacity-70 ease-in duration-200"
                            : ""
                        } `}
                        onClick={() => handleDayVotePlayer(player)}
                      >
                        <figure>
                          <img
                            src={player.alive ? getImage(player.role) : grave}
                            alt="Role"
                            className="w-32 min-[1800px]:w-44"
                          />
                        </figure>
                        {voteData.votes !== null &&
                        voteData.votes[player.number] !== undefined ? (
                          <div className="badge badge-warning absolute bottom-3 right-2 font-bold">
                            Vote {voteData.votes[player.number]}
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={`badge ${
                          user.id === player.id
                            ? "badge-error"
                            : "badge-success"
                        } w-fit mr-8 mt-2 font-bold min-[2000px]:mr-16`}
                      >
                        {player.number} {player.username}
                      </div>
                    </div>
                  );
                }
              }
            }
          })}
        </div>
      </div>
      <div className="flex-auto w-32 flex flex-col h-full">
        {/* Room Details */}
        <div className="flex-auto h-48 pr-8 pt-5 pb-2 flex flex-col">
          <div className="bg-black bg-opacity-70 border-gray-500 border-solid border-2 w-full h-full rounded-2xl shadow-2xl text-white flex flex-col justify-between pb-3">
            {/* Top */}
            <div className=" w-full h-1/6 flex justify-between px-7 items-center border-b-2 border-white max-[1000px]:px-3">
              {/* Room ID */}
              <div className="flex h-1/6 items-center relative">
                <h1 className="text-lg flex ">
                  <span className="font-semibold mr-1">Room ID: </span> {roomId}
                </h1>
                {roomData.status !== "STARTED" && (
                  <>
                    <MdOutlineContentCopy
                      title="Copy room id to clipboard"
                      className="text-xl ml-3 cursor-pointer"
                      onClick={() => {
                        setCopied(true);
                        navigator.clipboard.writeText(roomId);
                        // alert("Copied to clipboard");
                        setTimeout(() => setCopied(false), 1000);
                      }}
                    />
                    {copied && (
                      <p className="absolute -right-20 text-white text-xl">
                        Copied!
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center text-xl mr-5 max-[1000px]:mr-0">
                <BsPeopleFill />
                <p className="ml-3">{roomData.players.length}/16</p>
              </div>
              <GameResult
                winner={roomData.winner}
                userRole={user.role}
                isVisible={isGameResultVisible}
                close={closeGameResult}
              />

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
              {roomData.status !== "STARTED" ? (
                <h1 className="m-auto">
                  Still waiting for other players to join...
                </h1>
              ) : roomData.phase === "night" ? (
                <h1 className="m-auto flex items-center">
                  <MdOutlineTimer />
                  {user.role !== "Villager"
                    ? `${user.role} discussions in ${remainingTime / 1000}s...`
                    : "It's night time, go back to sleep Zzzz"}
                </h1>
              ) : (
                <h1 className="m-auto flex ">
                  You've got 60 seconds, let's discuss and vote!{" "}
                  <span className="text-red-400 flex items-center ml-2">
                    {" "}
                    <MdOutlineTimer />{" "}
                    <span className="ml-1">{remainingTime / 1000}s</span>
                  </span>
                </h1>
              )}
            </div>
            {roomData.status === "STARTED" && (
              <div className="flex flex-col w-full">
                <div className="flex text-6xl mx-auto justify-evenly w-10/12 cursor-pointer">
                  <GiWolfHowl
                    className={`${
                      roleDescription === 0 ? "text-red-400" : "text-white"
                    }`}
                    onClick={() => setRoleDescription(0)}
                  />
                  <FaRegEye
                    className={`${
                      roleDescription === 1 ? "text-red-400" : "text-white"
                    }`}
                    onClick={() => setRoleDescription(1)}
                  />
                  <BsFillPersonFill
                    className={`${
                      roleDescription === 2 ? "text-red-400" : "text-white"
                    }`}
                    onClick={() => setRoleDescription(2)}
                  />
                </div>

                <div className="mx-auto w-10/12 h-2/3 mt-2">
                  <div className="flex flex-col m-auto w-[400px] text-lg text-left mt-3">
                    <p>
                      <b>Role:</b> {description[roleDescription].role}
                    </p>
                    <p>
                      <b>Action:</b> {description[roleDescription].action}
                    </p>
                    <p>
                      <b>Team:</b> {description[roleDescription].team}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom */}
            <div
              className={`w-full ${
                roomData.status === "STARTED" ? "h-0" : "h-1/6"
              } px-5  flex justify-end items-center`}
            >
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
                        [{msg.senderName}]:{" "}
                        <span className="text-white">{msg.message}</span>
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
                      <p
                        key={index}
                        className={`text-lg  ${
                          msg.senderName === "System"
                            ? "text-red-400"
                            : "text-green-300"
                        }`}
                      >
                        [{msg.senderName}]:{" "}
                        <span className="text-white">{msg.message}</span>
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
