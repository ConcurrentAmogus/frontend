import axios from "axios";
import React, { useEffect, useState } from "react";
import { ROOM_API, USER_API, WS_ENDPOINT } from "../lib/api";
import logo from "../img/logo.png";
import { Button, Input } from "react-daisyui";
import { v4 as uuid } from "uuid";
import { useNavigate } from "react-router-dom";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { useUserDispatch, useUserState } from "../context/UserContext";

let stompClient = null;
function Home() {
  /********************************************
   VARIABLE
   *********************************************/
  const navigate = useNavigate();
  const userDispatch = useUserDispatch();

  /********************************************
   STATE
   *********************************************/
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [userList, setUserList] = useState([]);

  /********************************************
   CALLBACK
   *********************************************/
  useEffect(() => {
    connectWebSocket();
    getAllUsers();
  }, []);

  // WebSocket connection
  function connectWebSocket() {
    const socket = new SockJS(WS_ENDPOINT);
    stompClient = Stomp.over(socket);
    stompClient.connect({}, handleConnect, handleError);
  }

  function handleConnect() {
    console.log("Connected to the WebSocket");
  }

  function handleError(err) {
    console.log("Error in connecting WebSocket ", err);
  }

  // API call
  async function getAllUsers() {
    const res = await axios.get(USER_API);
    const data = res.data;

    setUserList(data);
  }

  async function getRoom(roomId) {
    const res = await axios.get(ROOM_API + `/${roomId}`);

    return res.data;
  }

  async function getRoomAvailability() {
    const res = await axios.get(ROOM_API + `/check-availability/${roomId}`);

    return res.data;
  }

  async function createNewUser() {
    const newUser = {
      id: uuid().slice(0, 5),
      username: username,
      record: [0, 0],
    };

    userDispatch({
      type: "SET_USER_DATA",
      payload: newUser,
    });

    const res = await axios.post(USER_API, newUser);

    return res.data;
  }

  // Action
  async function joinRoom() {
    if (username.trim() !== "" && roomId.trim() !== "") {
      const roomAvailability = await getRoomAvailability();
      console.log("roomAvailability", roomAvailability);

      let currentUser = null;
      if (roomAvailability.available === "true") {
        const joined = await userIsJoined();
        if (joined) {
          alert("Sorry, the user is already in the room");
          return;
        }

        if (!userIsExisted()) {
          currentUser = await createNewUser();
        } else {
          currentUser = userList.filter(
            (user) => user.username === username.trim()
          )[0];
        }

        userDispatch({
          type: "SET_USER_DATA",
          payload: currentUser,
        });

        const room = {
          id: roomId,
          newRoom: false,
          host: null,
          newJoinPlayer: currentUser,
        };

        stompClient.send("/ws/update-room", {}, JSON.stringify(room));
        // stompClient.send("/ws/update-room", {}, JSON.stringify(room));
        // stompClient.send("/ws/update-room", {}, JSON.stringify(room));
        // stompClient.send("/ws/update-room", {}, JSON.stringify(room));
        navigate(`/room/${roomId}`);
      } else {
        const reason = roomAvailability.reason;
        if (reason === "STARTED") {
          alert("Sorry, the game has been started.");
        } else if (reason === "ENDED") {
          alert("Sorry, the game is ended.");
        } else if (reason === "FULL") {
          alert("Sorry, the room is full.");
        } else {
          alert("Sorry, the game room is not existed.");
        }
      }
    } else {
      alert("Please enter your username and room id before joining a room");
    }
  }

  async function createRoom() {
    if (username.trim() !== "") {
      let host = null;
      if (!userIsExisted()) {
        host = await createNewUser();
      } else {
        host = userList.filter((user) => user.username === username.trim())[0];
      }

      userDispatch({
        type: "SET_USER_DATA",
        payload: host,
      });

      const newRoom = {
        id: uuid().slice(0, 5),
        status: "WAITING",
        newRoom: true,
        host: host,
        newJoinPlayer: host,
        players: [],
      };

      stompClient.send("/ws/update-room", {}, JSON.stringify(newRoom));
      navigate(`/room/${newRoom.id}`);
    } else {
      alert("Please enter your username");
    }
  }

  function userIsExisted() {
    const existedUser = userList.filter(
      (user) => user.username === username.trim()
    );
    if (existedUser.length > 0) {
      userDispatch({
        type: "SET_USER_DATA",
        payload: existedUser[0],
      });
    }
    return existedUser.length > 0;
  }

  async function userIsJoined() {
    const room = await getRoom(roomId);

    const existedUser = room.players.filter(
      (player) => player.username === username.trim()
    );

    return existedUser.length > 0;
  }

  return (
    <div className="bg-[url('/src/img/bg-home.jpg')] h-screen bg-no-repeat bg-center bg-cover">
      <div className="flex flex-col w-fit h-fit text-center m-auto">
        <img
          src={logo}
          alt="logo"
          className="w-8/12 h-8/12 m-auto pt-5 min-[1800px]:w-11/12 min-[1800px]:h-11/12"
        />

        <div className="pt-5 w-96 m-auto ">
          <div className="w-full">
            <span className="bg-warning p-3.5 rounded-l-lg font-bold">
              Username
            </span>
            <Input
              className="w-2/3 rounded-none rounded-r-lg"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              bordered
            />
          </div>

          <div className="mt-10">
            <div>
              <Input
                className="w-2/3 rounded-none rounded-l-lg"
                type="text"
                placeholder="Enter room id"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                bordered
              />
              <span
                className="bg-warning p-3.5 rounded-r-lg font-bold cursor-pointer"
                onClick={joinRoom}
              >
                Join Room
              </span>
            </div>

            <p className="text-white font-bold my-3">OR</p>
            <Button
              className="rounded-lg cursor-pointer px-5 bg-green-600"
              onClick={createRoom}
            >
              Create Room
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
