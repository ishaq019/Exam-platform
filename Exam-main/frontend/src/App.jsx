import React from "react";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/Navbar";

function App() {
  return (
    <div className="app-shell">
      <div className="app-orb app-orb-left" />
      <div className="app-orb app-orb-right" />

      <Navbar />
      <main className="app-main container">
        <AppRoutes />
      </main>
    </div>
  );
}

export default App;