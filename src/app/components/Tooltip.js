import React, { useState } from "react";

function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative flex items-center smoothness z-50 figtree"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="absolute -bottom-12 transition-opacity duration-200 left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-black bg-opacity-70 text-white text-xs py-1 px-2 rounded-md shadow-md
               before:content-[''] before:absolute before:left-1/2 before:-translate-x-1/2 before:bottom-full
               before:border-4 before:border-transparent before:border-b-black before:opacity-80"
        >
          {text}
        </div>
      )}
    </div>
  );
}

export default Tooltip;
