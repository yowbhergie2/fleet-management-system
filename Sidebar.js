import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaCar, FaSignOutAlt, FaTicketAlt, FaGasPump } from 'react-icons/fa';
import { useUser } from '@/stores/authStore';

const Sidebar = ({ isOpen }) => {
  const user = useUser();

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
        {(user?.role === 'driver' || user?.role === 'admin') && (
          <>
            <li>
              <NavLink to="/fuel-requisitions/create">
                <FaGasPump />
                {isOpen && <span>Create Request</span>}
              </NavLink>
            </li>
            <li>
              <NavLink to="/fuel-requisitions/my-requests">
                <FaGasPump />
                {isOpen && <span>My Requests</span>}
              </NavLink>
            </li>
          </>
        )}
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