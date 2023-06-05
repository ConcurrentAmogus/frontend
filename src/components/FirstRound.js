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
            if(gameState.players.length==16){
                alert('Room is full...loading');
                return; //go to next part
            }

            setGameState({
                ...gameState,
                inLobby: false,
            });
        };
        const joinGame = () =>{
            setGameState({
                ...gameState,
                players: [...gameState.players, `Player ${gameState.players.length + 1}`],
            });
        };
        const selectPlayer = (player) =>{
            setGameState({
                ...gameState,
                selectedPlayer: player, 
            });
        };
        const votePlayer = (player) =>{
            //Update gamestate based on voting result
            setGameState({
                ...gameState,
            });
        };

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
}

export default FirstRound;