import React, { useState, useEffect } from "react";
import { maintenanceAPI } from "../api/endpoints";

const MaintenancePage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
        const res = await maintenanceAPI.getAll();
        setTickets(res.data || []);
    } catch (err) {
        console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Maintenance Tickets</h1>
      <div className="bg-white rounded shadow text-center p-10 text-gray-500">
          Tracking {tickets.length} active maintenance tickets.
      </div>
    </div>
  );
};

export default MaintenancePage;
