import React from "react";

function Screen({ msg }) {
  return (
    <div className="fixed w-full h-screen bg-black bg-opacity-70 z-50 flex">
      <h1 className="text-white text-6xl m-auto">{msg}</h1>
    </div>
  );
}

export default Screen;
