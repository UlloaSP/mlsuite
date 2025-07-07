import { Route, Routes } from "react-router-dom";
import Home from "./Home";

const Body = () => {
  return (
    <div className="body-content fade-in" id="content">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/user" element={<Home />} />
        <Route path="/notifications" element={<Home />} />
        <Route path="/settings" element={<Home />} />
      </Routes>
    </div>
  );
};

export default Body;
