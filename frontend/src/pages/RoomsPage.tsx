import React, { useState, useEffect } from "react";
import { roomAPI, propertyAPI } from "../api/endpoints";

interface Room {
  id: number;
  propertyId: number;
  roomNumber: string;
  roomType: string;
  maxGuests: number;
  basePrice: number;
  status: string;
  description?: string;
  breakfastIncluded?: boolean;
  breakfastPrice?: number;
}

const ROOM_TYPES = [
  {
    name: "Singola",
    icon: "🛏️",
    beds: "1 Letto Singolo",
    maxGuests: 1,
    description: "Camera con un letto singolo"
  },
  {
    name: "Matrimoniale Piccola",
    icon: "🛏️",
    beds: "1 Letto Matrimoniale Piccolo",
    maxGuests: 2,
    description: "Camera matrimoniale compatta"
  },
  {
    name: "Doppia",
    icon: "🛏️🛏️",
    beds: "2 Letti Singoli",
    maxGuests: 2,
    description: "Camera con due letti singoli"
  },
  {
    name: "Matrimoniale",
    icon: "🛏️",
    beds: "1 Letto Matrimoniale",
    maxGuests: 2,
    description: "Camera con un letto matrimoniale"
  },
  {
    name: "Tripola",
    icon: "🛏️🛏️🛏️",
    beds: "3 Letti",
    maxGuests: 3,
    description: "Camera con tre letti"
  },
  {
    name: "Familiare",
    icon: "👨‍👩‍👧‍👦",
    beds: "1 Letto King Size + 1 Letto Singolo",
    maxGuests: 3,
    description: "Camera con un letto king size e un letto singolo"
  }
];

const getRoomTypeIcon = (roomType: string) => {
  const type = ROOM_TYPES.find(t => t.name === roomType);
  return type ? type.icon : "🛏️";
};

const getRoomTypeInfo = (roomType: string) => {
  return ROOM_TYPES.find(t => t.name === roomType);
};

const RoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    propertyId: 0,
    roomNumber: "",
    roomType: "Singola",
    maxGuests: 1,
    basePrice: 100,
    status: "AVAILABLE",
    description: "",
    breakfastIncluded: false,
    breakfastPrice: 0,
  });

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadRooms(selectedProperty);
    }
  }, [selectedProperty]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await propertyAPI.getAll();
      const propertiesData = response.data || [];
      setProperties(propertiesData);
      if (propertiesData.length > 0 && !selectedProperty) {
        setSelectedProperty(propertiesData[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load properties:", err);
      setError(err.response?.data?.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async (propertyId: number) => {
    try {
      setLoading(true);
      setError("");
      const response = await roomAPI.getByProperty(propertyId);
      setRooms(response.data || []);
    } catch (err: any) {
      console.error("Failed to load rooms:", err);
      setError(err.response?.data?.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    let newValue: any = value;
    
    if (name === "roomType") {
      const selectedType = ROOM_TYPES.find(t => t.name === value);
      setFormData((prev) => ({
        ...prev,
        roomType: value,
        maxGuests: selectedType?.maxGuests || prev.maxGuests,
      }));
      return;
    }
    
    if (name === "breakfastIncluded") {
      newValue = (e.target as HTMLInputElement).checked;
    }

    if (name === "maxGuests" || name === "basePrice" || name === "propertyId" || name === "breakfastPrice") {
      newValue = Number(value);
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (editingRoomId) {
        await roomAPI.update(editingRoomId, {
          ...formData,
          propertyId: selectedProperty,
        });
      } else {
        await roomAPI.create({
          ...formData,
          propertyId: selectedProperty,
        });
      }
      if (selectedProperty) {
        await loadRooms(selectedProperty);
      }
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save room");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (roomId: number, status: string) => {
    try {
      setLoading(true);
      await roomAPI.updateStatus(roomId, status);
      if (selectedProperty) {
        await loadRooms(selectedProperty);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update room status");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCleaned = async (roomId: number) => {
    await handleStatusUpdate(roomId, "AVAILABLE");
  };

  const resetForm = () => {
    setFormData({
      propertyId: 0,
      roomNumber: "",
      roomType: "Singola",
      maxGuests: 1,
      basePrice: 100,
      status: "AVAILABLE",
      description: "",
      breakfastIncluded: false,
      breakfastPrice: 0,
    });
    setShowForm(false);
    setEditingRoomId(null);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      AVAILABLE: "#10b981",
      OCCUPIED: "#ef4444",
      MAINTENANCE: "#f59e0b",
      OUT_OF_SERVICE: "#6b7280",
      CLEANING: "#3b82f6",
    };
    return colors[status] || "#6b7280";
  };

  const startEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setShowForm(true);
    setFormData({
      propertyId: room.propertyId,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      maxGuests: room.maxGuests,
      basePrice: room.basePrice,
      status: room.status,
      description: room.description || "",
      breakfastIncluded: !!room.breakfastIncluded,
      breakfastPrice: room.breakfastPrice || 0,
    });
  };

  if (loading && properties.length === 0) {
    return <div className="loading">Loading rooms...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Rooms Management</h2>
        <div className="header-actions">
          {properties.length > 0 && (
            <select
              value={selectedProperty || ""}
              onChange={(e) => setSelectedProperty(Number(e.target.value))}
              className="property-select"
            >
              <option value="">Select Property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
            disabled={!selectedProperty}
          >
            {showForm ? "Cancel" : "+ Add Room"}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!selectedProperty ? (
        <div className="empty-state">
          <p>Please select a property to view rooms.</p>
        </div>
      ) : (
        <>
          {showForm && (
            <div className="form-card">
              <h3>{editingRoomId ? "Edit Room" : "Add New Room"}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="roomNumber">Room Number *</label>
                    <input
                      type="text"
                      id="roomNumber"
                      name="roomNumber"
                      value={formData.roomNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., 101"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="roomType">Room Type *</label>
                    <select
                      id="roomType"
                      name="roomType"
                      value={formData.roomType}
                      onChange={handleInputChange}
                      required
                    >
                      {ROOM_TYPES.map((type) => (
                        <option key={type.name} value={type.name}>
                          {type.icon} {type.name} ({type.beds})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="maxGuests">Max Guests *</label>
                    <input
                      type="number"
                      id="maxGuests"
                      name="maxGuests"
                      min="1"
                      max="10"
                      value={formData.maxGuests}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="basePrice">Base Price ($) *</label>
                    <input
                      type="number"
                      id="basePrice"
                      name="basePrice"
                      min="0"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="breakfastIncluded">Breakfast Included</label>
                    <input
                      type="checkbox"
                      id="breakfastIncluded"
                      name="breakfastIncluded"
                      checked={formData.breakfastIncluded}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="breakfastPrice">Breakfast Price ($)</label>
                    <input
                      type="number"
                      id="breakfastPrice"
                      name="breakfastPrice"
                      min="0"
                      step="0.01"
                      value={formData.breakfastPrice}
                      onChange={handleInputChange}
                      disabled={!formData.breakfastIncluded}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">Status *</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Saving..." : editingRoomId ? "Update Room" : "Create Room"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="room-types-guide">
            <h3>Available Room Types</h3>
            <div className="room-types-grid">
              {ROOM_TYPES.map((type) => (
                <div key={type.name} className="room-type-info">
                  <div className="type-icon">{type.icon}</div>
                  <div className="type-details">
                    <h4>{type.name}</h4>
                    <p>{type.beds}</p>
                    <p className="guests">👥 Max {type.maxGuests} {type.maxGuests === 1 ? "guest" : "guests"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rooms-grid">
            {rooms.length === 0 ? (
              <div className="empty-state">
                <p>No rooms found for this property. Add rooms to get started!</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="room-card">
                  <div
                    className="room-status-indicator"
                    style={{ backgroundColor: getStatusColor(room.status) }}
                  />
                  <div className="room-header">
                    <div className="room-number-section">
                      <h3>Room {room.roomNumber}</h3>
                      <span className="room-type-icon">{getRoomTypeIcon(room.roomType)}</span>
                    </div>
                  </div>
                  <div className="room-badge">{room.roomType}</div>
                  <div className="room-details">
                    <p>
                      <strong>👥 Max Guests:</strong> {room.maxGuests}
                    </p>
                    <p>
                      <strong>💰 Base Price:</strong> ${room.basePrice}/night
                    </p>
                    <p>
                      <strong>🥐 Breakfast:</strong> {room.breakfastIncluded ? `Included${room.breakfastPrice && room.breakfastPrice > 0 ? ` (+$${room.breakfastPrice})` : ""}` : "Not included"}
                    </p>
                    {room.description && (
                      <p>
                        <strong>📝 Description:</strong> {room.description}
                      </p>
                    )}
                    <p className="bed-info">
                      <strong>🛏️ Bed Type:</strong> {getRoomTypeInfo(room.roomType)?.beds}
                    </p>
                  </div>
                  <div className="room-actions">
                    <select
                      value={room.status}
                      onChange={(e) => handleStatusUpdate(room.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="CLEANING">Cleaning</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                    </select>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => startEditRoom(room)}
                      type="button"
                    >
                      Edit
                    </button>
                    {room.status === "CLEANING" && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleMarkCleaned(room.id)}
                        type="button"
                      >
                        Mark Cleaned
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RoomsPage;
