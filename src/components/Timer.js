import React from 'react';

const Timer = ({ remainingTime }) => {
  return (
    <div>
      <h2>Time: {remainingTime / 1000}s</h2>
    </div>
  );
};

export default Timer;