import React, { useState, useEffect } from 'react';

// Mock data - replace with your Firestore connection
const initialVehicles = [
  { id: '1', dpwhNo: 'V001', brand: 'Toyota', model: 'Hilux', plateNo: 'ABC-1234' },
  { id: '2', dpwhNo: 'V002', brand: 'Mitsubishi', model: 'Montero', plateNo: 'DEF-5678' },
];

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState({ dpwhNo: '', brand: '', model: '', plateNo: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // In a real app, you would fetch this data from Firestore
    setVehicles(initialVehicles);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentVehicle({ ...currentVehicle, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      // Update logic (e.g., updateDoc in Firestore)
      setVehicles(vehicles.map(v => v.id === currentVehicle.id ? currentVehicle : v));
      console.log('Updating vehicle:', currentVehicle);
    } else {
      // Create logic (e.g., addDoc in Firestore)
      const newVehicle = { ...currentVehicle, id: Date.now().toString() }; // temporary ID
      setVehicles([...vehicles, newVehicle]);
      console.log('Adding vehicle:', newVehicle);
    }
    resetForm();
  };

  const handleEdit = (vehicle) => {
    setIsEditing(true);
    setCurrentVehicle(vehicle);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      // Delete logic (e.g., deleteDoc in Firestore)
      setVehicles(vehicles.filter(v => v.id !== id));
      console.log('Deleting vehicle with id:', id);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setCurrentVehicle({ dpwhNo: '', brand: '', model: '', plateNo: '' });
  };

  return (
    <div className="vehicle-management">
      <h2>Vehicle Management</h2>
      <button onClick={() => { setShowForm(true); setIsEditing(false); }}>Add New Vehicle</button>

      {showForm && (
        <div className="vehicle-form">
          <h3>{isEditing ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
          <form onSubmit={handleSubmit}>
            <input name="dpwhNo" value={currentVehicle.dpwhNo} onChange={handleInputChange} placeholder="DPWH No." required />
            <input name="brand" value={currentVehicle.brand} onChange={handleInputChange} placeholder="Brand" required />
            <input name="model" value={currentVehicle.model} onChange={handleInputChange} placeholder="Model" required />
            <input name="plateNo" value={currentVehicle.plateNo} onChange={handleInputChange} placeholder="Plate No." required />
            <button type="submit">{isEditing ? 'Update' : 'Save'}</button>
            <button type="button" onClick={resetForm}>Cancel</button>
          </form>
        </div>
      )}

      <table className="vehicle-table">
        <thead>
          <tr>
            <th>DPWH No.</th>
            <th>Brand</th>
            <th>Model</th>
            <th>Plate No.</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map(vehicle => (
            <tr key={vehicle.id}>
              <td>{vehicle.dpwhNo}</td>
              <td>{vehicle.brand}</td>
              <td>{vehicle.model}</td>
              <td>{vehicle.plateNo}</td>
              <td>
                <button onClick={() => handleEdit(vehicle)}>Edit</button>
                <button onClick={() => handleDelete(vehicle.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VehicleManagement;