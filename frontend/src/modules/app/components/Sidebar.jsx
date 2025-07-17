import "./Sidebar.css";
import {
  Home as HomeIcon,
  User as UserIcon,
  Bell as BellIcon,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

const navItems = [
  { id: "home", path: "/", icon: HomeIcon },
  { id: "user", path: "/user", icon: UserIcon },
  { id: "notifications", path: "/notifications", icon: BellIcon },
  { id: "settings", path: "/settings", icon: SettingsIcon },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const buttonRefs = useRef({});

  /* ----------------- Dark‑mode persistence ----------------- */
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  /* ----------------- Fullscreen state sync ----------------- */
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  /* ----------------- Helper to animate transition ----------------- */
  const animateTransition = (targetPath, originButton) => {
    const content = document.getElementById("content");
    if (!content) {
      navigate(targetPath);
      return;
    }

    // Compute transform origin based on button center
    if (originButton) {
      const rect = originButton.getBoundingClientRect();
      const originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      const originY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--origin-x", `${originX}%`);
      document.documentElement.style.setProperty("--origin-y", `${originY}%`);
    }

    content.classList.remove("fade-in");
    content.classList.add("fade-out");

    setTimeout(() => {
      navigate(targetPath);
      content.classList.remove("fade-out");
      content.classList.add("fade-in");
    }, 250); // Duration matches CSS transition
  };

  /* ----------------- Fullscreen toggle ----------------- */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="sidebar">
      {/* Avatar */}
      <div className="avatar">
        <img
          src="/avatar-placeholder.png"
          alt="User Avatar"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      {/* eslint-disable-next-line no-unused-vars */}
      {navItems.map(({ id, path, icon: Icon }) => (
        <button
          key={id}
          ref={(el) => (buttonRefs.current[id] = el)}
          className={`nav-button ${location.pathname === path ? "active" : ""}`}
          onClick={() => animateTransition(path, buttonRefs.current[id])}
          title={id}
        >
          <Icon size={20} />
        </button>
      ))}
      <div className="divider" />
      {/* Dark‑mode toggle */}
      <button
        className="nav-button"
        onClick={() => setDarkMode((prev) => !prev)}
        title="Toggle theme"
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      {/* Fullscreen toggle */}
      <button
        className="nav-button"
        onClick={toggleFullscreen}
        title="Toggle fullscreen"
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>
    </div>
  );
};

export default Sidebar;
