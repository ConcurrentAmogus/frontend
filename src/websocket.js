import React, { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";

function WebSocketConn() {
  const [message, setMessage] = useState("");
  const [greeting, setGreeting] = useState([]);

  const socket = null;
  const stompClient = null;

  const handleChange = (event) => {
    setMessage(event.target.value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    stompClient.send("/app/hello", {}, JSON.stringify({ message }));
  };

  function connect() {
    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = Stomp.over(socket);

    stompClient.connect({}, (frame) => {
      console.log("Connected to WebSocket server ", frame);
      stompClient.subscribe("/topic/greetings", (response) => {
        console.log(response);
        console.log(JSON.parse(response.body));
        setGreeting([...greeting, JSON.parse(response.body).content]);
        console.log("Greeting", greeting);
      });
    });
  }

  function disconnect() {
    if (stompClient != null) {
      stompClient.disconnect();
    }

    console.log("Disconnected");
  }

  // useEffect(() => {
  //   const socket = new SockJS("http://localhost:8080/ws");
  //   const stompClient = Stomp.over(socket);

  //   stompClient.connect({}, () => {
  //     console.log("Connected to WebSocket server");
  //     stompClient.subscribe("/topic/greetings", (response) => {
  //       console.log(response);
  //       console.log(JSON.parse(response.body));
  //       setGreeting([...greeting, JSON.parse(response.body).content]);
  //     });

  //     stompClient.subscribe("/broker-2/new", (response) => {
  //       console.log(response);
  //       console.log(JSON.parse(response.body));
  //       setGreeting([...greeting, JSON.parse(response.body).content]);
  //     });
  //   });
  // }, []);

  return (
    <div>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
      <form onSubmit={handleSubmit}>
        <label>
          Message:
          <input type="text" value={message} onChange={handleChange} />
        </label>
        <button type="submit">Send</button>
      </form>

      <label>Server:</label>
      {greeting.map((g) => (
        <p key={g}>{g}</p>
      ))}
    </div>
  );
}

export default WebSocketConn;
