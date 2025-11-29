import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { FaBars } from 'react-icons/fa';
import './Layout.css'; // We will create this CSS file next

const MainLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="main-layout">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="content-area">
        <header className="top-bar">
          <button onClick={toggleSidebar} className="sidebar-toggle-btn">
            <FaBars />
          </button>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;