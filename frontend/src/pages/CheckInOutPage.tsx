import React from "react";

const CheckInOutPage: React.FC = () => {
  return (
    <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Check In & Check Out Operations</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-6 rounded border border-green-200">
                <h2 className="text-xl font-bold text-green-900 mb-4">Expected Arrivals (Today)</h2>
                <p className="text-gray-600">No arrivals scheduled for today.</p>
            </div>
            <div className="bg-red-50 p-6 rounded border border-red-200">
                <h2 className="text-xl font-bold text-red-900 mb-4">Expected Departures (Today)</h2>
                <p className="text-gray-600">No departures scheduled for today.</p>
            </div>
        </div>
    </div>
  );
};

export default CheckInOutPage;
