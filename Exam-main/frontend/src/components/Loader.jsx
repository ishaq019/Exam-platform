
import React from "react";

export default function Loader({ text = "" }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      {text && <div className="loader-text">{text}</div>}
    </div>
  );
}
