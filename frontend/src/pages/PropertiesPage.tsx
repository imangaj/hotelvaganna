import React, { useState, useEffect } from "react";
import { propertyAPI } from "../api/endpoints";

interface Property {
  id: number;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
}

const PropertiesPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentProperty, setCurrentProperty] = useState<Partial<Property>>({});

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await propertyAPI.getAll();
      setProperties(res.data);
    } catch (error) {
      console.error("Error fetching properties", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this property?")) return;
    try {
        await propertyAPI.delete(id);
        fetchProperties();
    } catch (err) {
        console.error("Failed to delete", err);
    }
  };

  const handleSave = async () => {
      try {
          if (currentProperty.id) {
              await propertyAPI.update(currentProperty.id, currentProperty);
          } else {
              await propertyAPI.create(currentProperty);
          }
          setShowModal(false);
          fetchProperties();
          setCurrentProperty({});
      } catch (err) {
          console.error("Failed to save", err);
      }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Properties</h1>
        <button 
            className="bg-primary-600 text-white px-4 py-2 rounded shadow hover:bg-primary-700" 
            onClick={() => { setCurrentProperty({}); setShowModal(true); }}
        >
            + Add Property
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-bold mb-2 text-primary-900">{p.name}</h3>
                  <p className="text-gray-600 mb-4 text-sm">{p.address}, {p.city}</p>
                  <div className="flex gap-2 justify-end">
                      <button className="text-blue-600 hover:underline text-sm" onClick={() => { setCurrentProperty(p); setShowModal(true); }}>Edit</button>
                      <button className="text-red-600 hover:underline text-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                  </div>
              </div>
          ))}
          {properties.length === 0 && !loading && (
              <div className="col-span-full text-center py-10 text-gray-500">No properties found. Add one to get started.</div>
          )}
      </div>

      {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4">{currentProperty.id ? "Edit Property" : "Add Property"}</h2>
                  <div className="space-y-4">
                      <input className="border p-2 w-full rounded" placeholder="Property Name" value={currentProperty.name || ""} onChange={e => setCurrentProperty({...currentProperty, name: e.target.value})} />
                      <input className="border p-2 w-full rounded" placeholder="Address" value={currentProperty.address || ""} onChange={e => setCurrentProperty({...currentProperty, address: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                        <input className="border p-2 w-full rounded" placeholder="City" value={currentProperty.city || ""} onChange={e => setCurrentProperty({...currentProperty, city: e.target.value})} />
                        <input className="border p-2 w-full rounded" placeholder="Country" value={currentProperty.country || ""} onChange={e => setCurrentProperty({...currentProperty, country: e.target.value})} />
                      </div>
                      <input className="border p-2 w-full rounded" placeholder="Phone" value={currentProperty.phone || ""} onChange={e => setCurrentProperty({...currentProperty, phone: e.target.value})} />
                      <input className="border p-2 w-full rounded" placeholder="Email" value={currentProperty.email || ""} onChange={e => setCurrentProperty({...currentProperty, email: e.target.value})} />
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button className="px-4 py-2 text-gray-600" onClick={() => setShowModal(false)}>Cancel</button>
                      <button className="px-4 py-2 bg-primary-600 text-white rounded" onClick={handleSave}>Save</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PropertiesPage;