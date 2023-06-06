import React, { useState } from 'react';

function FirstRound(){
    const initialState = {
        players: [],
        currentPlayerIndex: 0,
        roles: [],
        selectedPlayer: null,
        wereWolvesWon: false,
        villagersWon: false,
        inLobby: true,
    };

    const werewolfGame = () => {
        const [gameState, setGameState] = useState(initialState);
        const startGame = () => {
            if(gameState.players.length<5){
                alert('Minimum 5 players to start the game.');
                return;
            }
            if(gameState.players.length==12){
                alert('Room is full...loading');
                return; //go to next part
            }

            const roles = generateRoles(gameState.players.length);
            
            setGameState({
                ...gameState,
                inLobby: false,
                roles: roles,
            });
        };
        const joinGame = () =>{
            setGameState({
                ...gameState,
                players: [...gameState.players, `Player ${gameState.players.length + 1}`],
            });
        };
        // const selectPlayer = (player) =>{
        //     setGameState({
        //         ...gameState,
        //         selectedPlayer: player, 
        //     });
        // };
        // const votePlayer = (player) =>{
        //     //Update gamestate based on voting result
        //     setGameState({
        //         ...gameState,
        //     });
        // };

        useEffect(() => {
            connectWebSocket();
            return() =>{
                if(stompClient !== null){
                    stompClient.disconnect();
                }
            };
        }, []);

        // WebSocket connection
        function connectWebSocket() {
            const socket = new SockJS(WS_ENDPOINT);
            stompClient = Stomp.over(socket);
            stompClient.connect({}, handleConnect, handleError);
        }

        function handleConnect() { //need to modify
            console.log("Connected to the WebSocket");
            socket.onmessage = (event)=>{
                const message = JSON.parse(event.data);
                handleIncomingMsg(message);
            };
        }

        function handleError(err) {
            alert("Error in connecting WebSocket ", err);
        }

        function handleIncomingMsg(message){
            if(message.type ==='roles'){
                const roles = message.data;
                setGameState({
                    ...gameState,
                    roles: roles,
                });
            }
        };

        function sendRolesToPlayers(players, roles){
            const message = {
                type: 'roles',
                data: roles,
            };
            const jsonMessage = JSON.stringify(message);
            stompClient.send('/app/sendRoles', {}, jsonMessage);
        }

        return(
            <div>
                <h1>Werewolf Game</h1>
                {gameState.inLobby ? (
                    <div>
                        <h2>Waiting Lobby</h2>
                        <p>Number of players: {gameState.players.length}</p>
                        <button onClick = {joinGame}>Join Game</button>
                        {(gameState.players.length >= 5 && gameState.players.length <=16)&&(
                            <button onClick = {startGame}>Start Game</button>
                        )};
                    </div>
                ):(
                    <div>
                        <h2>Current Player: {gameState.players[gameState.currentPlayerIndex]}</h2>
                        <h3>Select a player to vote:</h3>
                        <ul>
                            {gameState.players.map((player) => (
                                <li key = {player}>
                                    <button onClick = {() => selectPlayer(player)}>{player}</button>
                                </li>))}
                        </ul>
                        {gameState.selectedPlayer &&(
                            <div>
                                <h4>Vote for {gameState.selectedPlayer}:</h4>
                                <button onClick = {() => votePlayer(gameState.selectedPlayer)}>Vote</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };
    const generateRoles = (numOfPlayers) => {
        let numOfWerewolf;
        let numOfSeer;

        if(numOfPlayers >= 5 && numOfPlayers <=6){
            numOfWerewolf=1;
            numOfSeer=1;
        }
        else if(numOfPlayers >= 7 && numOfPlayers <=9){
            numOfWerewolf=2;
            numOfSeer=1;
        }
        else if(numOfPlayers >= 10 && numOfPlayers <=12){
            numOfWerewolf=3;
            numOfSeer=2;
        }
        else{
            return [];
        }

        const roles = [];
        roles.push('Werewolf'.repeat(numOfWerewolf));
        roles.push('Seer'.repeat(numOfSeer));
        roles.push('Villager'.repeat(numOfPlayers-numOfSeer-numOfWerewolf));

        //shuffle roles
        const shuffleRoles = roles.flat().sort(()=>Math.random()-0.5);
        return shuffleRoles;
    };
    return werewolfGame;
}

export default FirstRound;