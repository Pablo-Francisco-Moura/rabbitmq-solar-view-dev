import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import QueuesPage from "./pages/QueuesPage.js";
import UnitPage from "./pages/UnitPage.js";
import UnitsPage from "./pages/UnitsPage.js";

export default function App() {
  return (
    <div className="app">
      <nav className="app__nav">
        <NavLink
          to="/queues"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Filas
        </NavLink>
        <NavLink
          to="/unit"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Unit
        </NavLink>
        <NavLink
          to="/units"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Units
        </NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to="/queues" replace />} />
        <Route path="/queues" element={<QueuesPage />} />
        <Route path="/unit" element={<UnitPage />} />
        <Route path="/units" element={<UnitsPage />} />
      </Routes>
    </div>
  );
}
