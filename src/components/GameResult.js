import werewolfImage from "../img/win-werewolf.jpg";
import gameOverImage from "../img/game-over.png";
import villagerImage from "../img/win-villager.jpg";

function GameResult({ winner, isVisible, close }) {
  if (!isVisible) {
    return null;
  }

  const winnerStyles = {
    Wolf: {
      backgroundImage: `url(${werewolfImage})`,
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
    },
    Villager: {
      backgroundImage: `url(${villagerImage})`,
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
    },
  };

  const styleToShow = winnerStyles[winner] || {
    backgroundImage: `url(${villagerImage})`,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div
        style={styleToShow}
        className="relative w-3/4 h-3/4 rounded p-4 shadow-lg flex flex-col space-y-6 justify-center items-center"
      >
        <img src={gameOverImage} className="absolute top-0 pt-5" />
        <h1 className="font-mono text-5xl text-white">The winner is:</h1>
        <h2 className="font-mono text-6xl font-semibold text-white underline decoration-4 ">
          {winner}
        </h2>
        <button
          className="font-mono absolute bottom-8 bg-white hover:bg-gray-200 text-black font-bold py-2 px-4 rounded"
          onClick={close}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default GameResult;
