import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaCar, FaSignOutAlt, FaTicketAlt } from 'react-icons/fa';

const Sidebar = ({ isOpen }) => {
  // Dummy sign out function
  const handleSignOut = () => {
    // Replace with your actual Firebase sign-out logic
    console.log('Signing out...');
    // auth.signOut(); 
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h3>{isOpen ? 'FMS DPWH RO II' : 'FMS'}</h3>
      </div>
      <ul className="sidebar-menu">
        <li>
          <NavLink to="/dashboard">
            <FaTachometerAlt />
            {isOpen && <span>Dashboard</span>}
          </NavLink>
        </li>
        <li>
          <NavLink to="/trip-tickets">
            <FaTicketAlt />
            {isOpen && <span>Trip Tickets</span>}
          </NavLink>
        </li>
        {/* This link goes to the Vehicle Management page */}
        <li>
          <NavLink to="/admin/vehicles">
            <FaCar />
            {isOpen && <span>Vehicles</span>}
          </NavLink>
        </li>
      </ul>
      <div className="sidebar-footer">
        <button onClick={handleSignOut} className="signout-button">
          <FaSignOutAlt />
          {isOpen && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;