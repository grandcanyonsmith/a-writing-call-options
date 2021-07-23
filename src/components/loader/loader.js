import loaderWheel from "images/loader-wheel.svg"
import { useState } from "react";
import "./loader.css"

export function Loader({ className }) {
  return (
    <div className={`react-loader ${className || ''}`}>
      <img src={loaderWheel} alt="Loading..." />
    </div>
  );
}

