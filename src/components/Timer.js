import React, { useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'webstomp-client';

const Timer = ({ roomId }) => {
  const [currentPhase, setCurrentPhase] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8081/api/timer/current-phase?roomId=${roomId}`)
      .then(response => response.text())
      .then(data => {
        setCurrentPhase(data);
        const socket = new SockJS('http://localhost:8081/ws-endpoint');
        const client = Stomp.over(socket);

        client.connect({}, (frame) => {
          console.log('Connected: ' + frame);
          const subscription = client.subscribe(`/remaining-time/${roomId}/${data}`, (message) => {
            try {
              if (message.body) {
                setRemainingTime(parseInt(message.body));
              }
            } catch (error) {
              console.error('Failed to parse message body:', message.body, error);
            }
          }, (error) => {
            console.error('Failed to subscribe:', error);
          });

          setStompClient({ client, subscription });

        }, (error) => {
          console.error('Failed to connect:', error);
        });
      })
      .catch(error => console.error('Error:', error));
  }, [roomId, currentPhase]);

  useEffect(() => {
    return () => {
      if (stompClient !== null) {
        stompClient.subscription.unsubscribe();
        stompClient.client.disconnect();
      }
    };
  }, [stompClient]);

  return (
    <div>
      <h2>Time: {remainingTime / 1000}s</h2>
    </div>
  );
};

export default Timer;