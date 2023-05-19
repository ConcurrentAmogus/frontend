import axios from "axios";
import React, { useEffect, useState } from "react";
import { ROOM_API, USER_API, WS_ENDPOINT } from "../lib/api";
import logo from "../img/logo.png";
import { Button, Input } from "react-daisyui";
import { v4 as uuid } from "uuid";
import { useNavigate } from "react-router-dom";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { useUserDispatch } from "../context/UserContext";

let stompClient = null;
function Home() {
  const navigate = useNavigate();
  const userDispatch = useUserDispatch();

  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [userList, setUserList] = useState([]);

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

  async function getRoomAvailability() {
    const res = await axios.get(ROOM_API + `/check-availability/${roomId}`);

    return res;
  }

  function createNewUser() {
    const newUser = {
      id: uuid().slice(0, 5),
      username: username,
      record: [0, 0],
    };

    axios
      .post(USER_API, newUser)
      .then((res) => {
        handleCreateNewUserResponse(res);
      })
      .catch((err) => {
        handleCreateNewUserError(err);
      });
  }

  function handleCreateNewUserResponse(res) {
    const user = res.data;

    userDispatch({
      type: "SET_USER_DATA",
      payload: user,
    });
  }

  function handleCreateNewUserError(err) {
    alert(err);
  }

  // Action
  function joinRoom() {
    if (username.trim() !== "" && roomId.trim() !== "") {
      getRoomAvailability()
        .then((res) => {
          const roomAvailability = res.data;

          if (roomAvailability.available === "true") {
            if (!userIsExisted()) {
              createNewUser();
            }
            navigate(`/room/${roomId}`);
          } else {
            const reason = roomAvailability.reason;
            if (reason === "STARTED") {
              alert("Sorry, the game has been started.");
            } else if (reason === "ENDED") {
              alert("Sorry, the game is ended.");
            } else {
              alert("Sorry, the game room is not existed.");
            }
          }
        })
        .catch((err) => {
          alert(err);
        });
    } else {
      alert("Please enter your username and room id before joining a room");
    }
  }

  function createRoom() {
    if (username.trim() !== "") {
      if (!userIsExisted()) {
        createNewUser();
      }

      const newRoom = {
        id: uuid().slice(0, 5),
        status: "WAITING",
        newRoom: true,
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

  return (
    <div className="bg-[url('/src/img/bg-home.jpg')] h-screen bg-no-repeat bg-center bg-cover">
      <div className="flex flex-col w-1/3  text-center m-auto">
        <img src={logo} alt="logo" className="w-5/6 h-5/6 m-auto pt-5" />

        <div className="pt-5 w-2/3 m-auto ">
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
