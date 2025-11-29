import React, { useState, useEffect } from 'react';

// Mock data for trip tickets - replace with your Firestore connection
const initialTripTickets = [
  { id: '1', ticketNo: 'TT-001', driver: 'Juan Dela Cruz', vehicle: 'Hilux (ABC-1234)', destination: 'Project Site A' },
  { id: '2', ticketNo: 'TT-002', driver: 'Maria Clara', vehicle: 'Montero (DEF-5678)', destination: 'Regional Office' },
];

const TripTickets = () => {
  const [tripTickets, setTripTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [currentTicket, setCurrentTicket] = useState({ ticketNo: '', driver: '', vehicle: '', destination: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // In a real app, you would fetch this data from Firestore
    setTripTickets(initialTripTickets);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentTicket({ ...currentTicket, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      // Update logic (e.g., updateDoc in Firestore)
      setTripTickets(tripTickets.map(t => t.id === currentTicket.id ? currentTicket : t));
      console.log('Updating trip ticket:', currentTicket);
    } else {
      // Create logic (e.g., addDoc in Firestore)
      const newTicket = { ...currentTicket, id: Date.now().toString() }; // temporary ID
      setTripTickets([...tripTickets, newTicket]);
      console.log('Adding trip ticket:', newTicket);
    }
    resetForm();
  };

  const handleEdit = (ticket) => {
    setIsEditing(true);
    setCurrentTicket(ticket);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this trip ticket?')) {
      // Delete logic (e.g., deleteDoc in Firestore)
      setTripTickets(tripTickets.filter(t => t.id !== id));
      console.log('Deleting trip ticket with id:', id);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setCurrentTicket({ ticketNo: '', driver: '', vehicle: '', destination: '' });
  };

  return (
    <div className="trip-ticket-management">
      <h2>Trip Ticket Management</h2>
      <button onClick={() => { setShowForm(true); setIsEditing(false); }}>Add New Trip Ticket</button>

      {showForm && (
        <div className="ticket-form">
          <h3>{isEditing ? 'Edit Trip Ticket' : 'Add Trip Ticket'}</h3>
          <form onSubmit={handleSubmit}>
            <input name="ticketNo" value={currentTicket.ticketNo} onChange={handleInputChange} placeholder="Ticket No." required />
            <input name="driver" value={currentTicket.driver} onChange={handleInputChange} placeholder="Driver" required />
            <input name="vehicle" value={currentTicket.vehicle} onChange={handleInputChange} placeholder="Vehicle" required />
            <input name="destination" value={currentTicket.destination} onChange={handleInputChange} placeholder="Destination" required />
            <button type="submit">{isEditing ? 'Update' : 'Save'}</button>
            <button type="button" onClick={resetForm}>Cancel</button>
          </form>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Ticket No.</th>
            <th>Driver</th>
            <th>Vehicle</th>
            <th>Destination</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tripTickets.map(ticket => (
            <tr key={ticket.id}>
              <td>{ticket.ticketNo}</td>
              <td>{ticket.driver}</td>
              <td>{ticket.vehicle}</td>
              <td>{ticket.destination}</td>
              <td>
                <button onClick={() => handleEdit(ticket)}>Edit</button>
                <button onClick={() => handleDelete(ticket.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TripTickets;