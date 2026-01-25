import React, { useState, useEffect, useMemo } from "react";
import { propertyAPI, ratesAPI } from "../api/endpoints";

interface Property {
  id: number;
  name: string;
}

interface RateData {
  date: string;
  roomTypeId: number;
  roomTypeName: string;
  price: number;
  totalRooms: number;
  totalPhysical: number;
  bookedRooms: number;
  availableRooms: number;
  isOverride: boolean;
  hasInventoryOverride: boolean;
  isClosed: boolean;
  enableBreakfast: boolean;
}

const PricingPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  
  // Date selection
  const today = new Date();
  const [startDateStr, setStartDateStr] = useState(today.toISOString().split("T")[0]);
  
  const [ratesData, setRatesData] = useState<RateData[]>([]);
  const [saveStatus, setSaveStatus] = useState<string>("");

  // Bulk Update State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
      roomTypeId: "all",
      startDate: "",
      endDate: "",
      price: "",
      availableCount: "",
      daysOfWeek: {0:true,1:true,2:true,3:true,4:true,5:true,6:true} as Record<number, boolean>,
      isClosed: "no-change" as "no-change" | "open" | "closed",
      enableBreakfast: "no-change" as "no-change" | "enabled" | "disabled"
  });

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadRates();
    }
  }, [selectedProperty, startDateStr]);

  const loadProperties = async () => {
    try {
      const res = await propertyAPI.getAll();
      setProperties(res.data || []);
      if (res.data?.length) setSelectedProperty(res.data[0].id);
    } catch (e) {
      console.error("Failed to load properties", e);
    }
  };

  const getEndDate = () => {
    const start = new Date(startDateStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 19); // Load 20 days
    return end.toISOString().split("T")[0];
  };

  const loadRates = async () => {
    if (!selectedProperty) return;
    setLoading(true);
    try {
      const res = await ratesAPI.get(Number(selectedProperty), startDateStr, getEndDate());
      setRatesData(res.data || []);
    } catch (e) {
      console.error("Failed to load rates", e);
    } finally {
      setLoading(false);
    }
  };

  // Process data for Grid
  // 1. Group Room Types by normalized name to avoid duplicate rows (e.g., multiple "Singola")
  const roomTypeGroups = useMemo(() => {
    const groups = new Map<string, { key: string; name: string; ids: number[] }>();

    ratesData.forEach((rate) => {
      const rawName = (rate.roomTypeName || "").trim();
      const key = rawName ? rawName.toLowerCase() : `type-${rate.roomTypeId}`;
      const name = rawName || `Room Type ${rate.roomTypeId}`;

      const existing = groups.get(key);
      if (existing) {
        if (!existing.ids.includes(rate.roomTypeId)) {
          existing.ids.push(rate.roomTypeId);
        }
      } else {
        groups.set(key, { key, name, ids: [rate.roomTypeId] });
      }
    });

    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ratesData]);

  // 2. Generate Dates Array
  const dates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(startDateStr);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  // 3. Lookup Helper
  const getRateById = (roomTypeId: number, date: string) => {
    return ratesData.find(r => r.roomTypeId === roomTypeId && r.date === date);
  };

  const getGroupRate = (roomTypeIds: number[], date: string) => {
    const groupRates = roomTypeIds
      .map((id) => getRateById(id, date))
      .filter(Boolean) as RateData[];

    if (groupRates.length === 0) return null;

    const primary = groupRates[0];
    const isClosed = groupRates.every((r) => r.isClosed);
    const enableBreakfast = groupRates.every((r) => r.enableBreakfast);
    const isOverride = groupRates.some((r) => r.isOverride);
    const hasInventoryOverride = groupRates.some((r) => r.hasInventoryOverride);

    return {
      ...primary,
      isClosed,
      enableBreakfast,
      isOverride,
      hasInventoryOverride,
    };
  };

  // 4. Update Handler
  const handlePriceUpdate = async (roomTypeIds: number[], date: string, newPrice: string) => {
    // If empty, do nothing or reset to 0? Let's assume numeric input only.
    if (newPrice.trim() === "") return; // Don't save empty string

    const price = parseFloat(newPrice);
    if (isNaN(price)) return;

    // Optimistic Update
    setRatesData(prev => prev.map(r => 
      (roomTypeIds.includes(r.roomTypeId) && r.date === date) 
      ? { ...r, price, isOverride: true }
      : r
    ));

    // API Call
    try {
        setSaveStatus("Saving...");
        await ratesAPI.update(
          Number(selectedProperty),
          roomTypeIds.map((id) => ({ roomTypeId: id, date, price }))
        );
        setSaveStatus("Saved");
        setTimeout(() => setSaveStatus(""), 2000);
    } catch (e) {
        setSaveStatus("Error saving!");
        console.error(e);
        // Revert (reload)
        loadRates();
    }
  };

  const handleInventoryUpdate = async (roomTypeIds: number[], date: string, newCount: string) => {
    // If empty string, maybe we want to reset to null? 
    // Backend expects number or null if we supported that. 
    // For now, let's assume they type a number. If they delete it, we might want to reset override.
    // Let's allow empty string to mean "reset to physical capacity" (null).
    
    let count: number | null = null;
    if (newCount !== "") {
        count = parseInt(newCount);
        if (isNaN(count)) return;
    }

    setRatesData(prev => prev.map(r => 
        (roomTypeIds.includes(r.roomTypeId) && r.date === date) 
        ? { 
            ...r, 
            totalRooms: count !== null ? count : r.totalPhysical, 
            hasInventoryOverride: count !== null 
          }
        : r
    ));

    try {
        setSaveStatus("Saving...");
        // If count is null, we send empty string or special value? 
        // Backend expects 'availableCount' in payload.
        await ratesAPI.update(
          Number(selectedProperty),
          roomTypeIds.map((id) => ({
            roomTypeId: id,
            date,
            // We only want to update inventory here. But upsert requires price if new.
            // But we have the current price in state!
            price: getRateById(id, date)?.price || 0,
            availableCount: count !== null ? count : "" // Send empty string for reset? Backend handles it?
          }))
        );
        setSaveStatus("Saved");
        setTimeout(() => setSaveStatus(""), 2000);
    } catch (e) {
        setSaveStatus("Error saving!");
        console.error(e);
        loadRates();
    }
  };

  const handleToggleUpdate = async (roomTypeIds: number[], date: string, field: 'isClosed' | 'enableBreakfast', value: boolean) => {
    setRatesData(prev => prev.map(r => 
        (roomTypeIds.includes(r.roomTypeId) && r.date === date) 
        ? { ...r, [field]: value }
        : r
    ));

    try {
        setSaveStatus("Saving...");
        await ratesAPI.update(
          Number(selectedProperty),
          roomTypeIds.map((id) => ({
            roomTypeId: id,
            date,
            price: getRateById(id, date)?.price || 0,
            [field]: value 
          }))
        );
        setSaveStatus("Saved");
        setTimeout(() => setSaveStatus(""), 2000);
    } catch (e) {
        setSaveStatus("Error saving!");
        console.error(e);
        loadRates();
    }
  };

  const  handleBulkUpdate = async () => {
    if (!bulkForm.startDate || !bulkForm.endDate) return alert("Select dates");
    
    setLoading(true);
    try {
        const start = new Date(bulkForm.startDate);
        const end = new Date(bulkForm.endDate);
        const updates: any[] = [];
        
        let curr = new Date(start);
        while (curr <= end) {
            if (bulkForm.daysOfWeek[curr.getDay()]) {
                const dateStr = curr.toISOString().split("T")[0];
                
                const selectedGroup = roomTypeGroups.find((g) => g.key === bulkForm.roomTypeId);
                const typeIds = bulkForm.roomTypeId === "all" 
                  ? roomTypeGroups.flatMap((g) => g.ids)
                  : (selectedGroup?.ids || []);
                
                typeIds.forEach(tid => {
                    const update: any = {
                        roomTypeId: tid,
                        date: dateStr
                    };
                    if (bulkForm.price) update.price = parseFloat(bulkForm.price);
                    if (bulkForm.availableCount) update.availableCount = parseInt(bulkForm.availableCount);
                    
                    if (bulkForm.isClosed !== "no-change") {
                        update.isClosed = bulkForm.isClosed === "closed";
                    }
                    if (bulkForm.enableBreakfast !== "no-change") {
                        update.enableBreakfast = bulkForm.enableBreakfast === "enabled";
                    }

                    updates.push(update);
                });
            }
            curr.setDate(curr.getDate() + 1);
        }

        await ratesAPI.update(Number(selectedProperty), updates);
        setShowBulkModal(false);
         // Reset form
        setBulkForm({
            ...bulkForm, 
            price: "", 
            availableCount: "",
            isClosed: "no-change",
            enableBreakfast: "no-change"
        });
        await loadRates();
        alert("Bulk update successful!");
    } catch (e) {
        console.error(e);
        alert("Bulk update failed");
    } finally {
        setLoading(false);
    }
  };

  // 5. Calculate Totals
  const getTotalBooked = (date: string) => {
    return roomTypeGroups.reduce((sum, group) => {
      const data = getGroupRate(group.ids, date);
      return sum + (data?.bookedRooms || 0);
    }, 0);
  };
  
  const getTotalRooms = (date: string) => {
    return roomTypeGroups.reduce((sum, group) => {
      const data = getGroupRate(group.ids, date);
      return sum + (data?.totalRooms || 0);
    }, 0);
   };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("it-IT", { timeZone: "Europe/Rome", weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pricing & Availability</h1>
        {saveStatus && <span className={`text-sm font-bold ${saveStatus.includes("Error") ? "text-red-500" : "text-green-600"}`}>{saveStatus}</span>}
      </div>

      <div className="pricing-filters flex gap-4 mb-6 items-end bg-white p-4 rounded shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
          <select 
            className="border border-gray-300 rounded-md p-2 w-64"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(Number(e.target.value))}
          >
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input 
            type="date" 
            className="border border-gray-300 rounded-md p-2"
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
          />
        </div>
        <div>
             <button 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm"
                onClick={loadRates}
            >
                Refresh
            </button>
        </div>
        <div className="ml-auto">
             <button 
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 shadow-sm"
                onClick={() => setShowBulkModal(true)}
            >
                Bulk Update
            </button>
        </div>
      </div>

      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-[500px] shadow-xl">
                <h3 className="text-xl font-bold mb-4">Bulk Update</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm mb-1">Room Type</label>
                        <select 
                            className="w-full border p-2 rounded"
                            value={bulkForm.roomTypeId}
                            onChange={(e) => setBulkForm({...bulkForm, roomTypeId: e.target.value})}
                        >
                            <option value="all">All Categories</option>
                            {roomTypeGroups.map(group => (
                              <option key={group.key} value={group.key}>{group.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        {/* Spacer */}
                    </div>
                    
                    <div>
                        <label className="block text-sm mb-1">Start Date</label>
                        <input 
                            type="date" 
                            className="w-full border p-2 rounded"
                            value={bulkForm.startDate}
                            onChange={(e) => setBulkForm({...bulkForm, startDate: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">End Date</label>
                        <input 
                            type="date" 
                            className="w-full border p-2 rounded"
                            value={bulkForm.endDate}
                            onChange={(e) => setBulkForm({...bulkForm, endDate: e.target.value})}
                        />
                    </div>
                </div>

                <div className="mb-4">
                     <label className="block text-sm mb-1">Days of Week</label>
                     <div className="flex gap-2">
                        {['S','M','T','W','T','F','S'].map((d, i) => (
                            <button 
                                key={i}
                                className={`w-8 h-8 rounded-full text-xs font-bold ${bulkForm.daysOfWeek[i] ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                                onClick={() => setBulkForm(prev => ({...prev, daysOfWeek: {...prev.daysOfWeek, [i]: !prev.daysOfWeek[i]}}))}
                            >
                                {d}
                            </button>
                        ))}
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm mb-1">Price</label>
                        <input 
                            type="number" 
                            className="w-full border p-2 rounded"
                            placeholder="Leave empty to keep"
                            value={bulkForm.price}
                            onChange={(e) => setBulkForm({...bulkForm, price: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Rooms to Sell</label>
                        <input 
                            type="number" 
                            className="w-full border p-2 rounded"
                            placeholder="Leave empty to keep"
                            value={bulkForm.availableCount}
                            onChange={(e) => setBulkForm({...bulkForm, availableCount: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Status</label>
                        <select 
                            className="w-full border p-2 rounded"
                            value={bulkForm.isClosed}
                            onChange={(e) => setBulkForm({...bulkForm, isClosed: e.target.value as any})}
                        >
                            <option value="no-change">No Change</option>
                            <option value="open">Open (Bookable)</option>
                            <option value="closed">Closed (Stop Sell)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Breakfast</label>
                        <select 
                            className="w-full border p-2 rounded"
                            value={bulkForm.enableBreakfast}
                            onChange={(e) => setBulkForm({...bulkForm, enableBreakfast: e.target.value as any})}
                        >
                            <option value="no-change">No Change</option>
                            <option value="enabled">Enabled</option>
                            <option value="disabled">Disabled</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <button 
                        className="px-4 py-2 border rounded hover:bg-gray-50"
                        onClick={() => setShowBulkModal(false)}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={handleBulkUpdate}
                    >
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>
      )}

      {loading && ratesData.length === 0 ? (
        <div className="text-center py-10 text-gray-500">Loading rates...</div>
      ) : (
        <div className="table-container pricing-table-container bg-white rounded shadow-lg border border-gray-200">
          <table className="min-w-full border-collapse pricing-table">
            <thead>
              <tr>
                <th className="sticky left-0 bg-gray-50 z-10 p-3 border-b border-r min-w-[200px] text-left text-sm font-bold text-gray-700">Room Category</th>
                {dates.map(date => (
                  <th key={date} className="p-3 border-b text-center min-w-[120px] bg-gray-50 border-r last:border-r-0">
                    <div className="font-semibold text-gray-900 text-sm whitespace-nowrap">{formatDateLabel(date)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roomTypeGroups.map((group) => (
                <tr key={group.key} className="hover:bg-gray-50 group-row">
                  <td className="sticky left-0 bg-white z-10 p-4 border-b border-r font-bold text-gray-800 shadow-sm">
                    {group.name}
                    <div className="text-xs text-gray-500 mt-1 font-normal">
                         Base Price & Occupancy
                    </div>
                  </td>
                  {dates.map(date => {
                    const data = getGroupRate(group.ids, date);
                    if (!data) return <td key={date} className="p-4 border-b border-r text-center text-gray-400 bg-gray-50">-</td>;
                    
                    const percent = data.totalRooms > 0 ? (data.bookedRooms / data.totalRooms) * 100 : 0;
                    const occupancyColor = percent >= 90 ? "text-red-600" : percent >= 50 ? "text-yellow-600" : "text-green-600";
                    
                    return (
                      <td key={date} className="p-2 border-b border-r text-center relative hover:bg-white transition-colors">
                        <div className="flex flex-col items-center gap-2">
                          {/* Price Input */}
                          <div className="relative w-full max-w-[90px]">
                            <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                            <input 
                              type="number" 
                              className={`w-full text-center border rounded p-1 pl-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none ${data.isOverride ? "bg-amber-50 border-amber-300 text-amber-900" : "border-gray-200"}`}
                              value={data.price}
                              onBlur={(e) => handlePriceUpdate(group.ids, date, e.target.value)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setRatesData(prev => prev.map(r => 
                                  (group.ids.includes(r.roomTypeId) && r.date === date)
                                    ? { ...r, price: isNaN(val) ? 0 : val }
                                    : r
                                ));
                              }}
                            />
                          </div>

                          {/* Inventory Input */}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                             <input 
                                type="number"
                                className={`w-8 text-center border-b ${data.hasInventoryOverride ? 'font-bold text-blue-600 border-blue-400' : 'border-gray-300'}`}
                                value={data.totalRooms}
                                onBlur={(e) => handleInventoryUpdate(group.ids, date, e.target.value)}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) {
                                    setRatesData(prev => prev.map(r => 
                                      (group.ids.includes(r.roomTypeId) && r.date === date)
                                      ? { ...r, totalRooms: val, hasInventoryOverride: true }
                                      : r
                                    ));
                                    }
                                }}
                             />
                             <span>left</span>
                          </div>
                          
                          {/* Flags: Closed & Breakfast */}
                           <div className="flex gap-2 mt-1">
                                <button 
                                    className={`text-xs px-1 rounded border ${data.isClosed ? 'bg-red-100 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}
                                  onClick={() => handleToggleUpdate(group.ids, date, 'isClosed', !data.isClosed)}
                                    title={data.isClosed ? "Room Closed (Stop Sell)" : "Room Open"}
                                >
                                    {data.isClosed ? "Closed" : "Open"}
                                </button>
                                <button 
                                    className={`text-xs px-1 rounded border ${data.enableBreakfast ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
                                  onClick={() => handleToggleUpdate(group.ids, date, 'enableBreakfast', !data.enableBreakfast)}
                                    title="Toggle Breakfast"
                                >
                                    ☕
                                </button>
                           </div>

                          <div className={`text-xs font-medium ${occupancyColor} bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 mt-1`}>
                            {data.bookedRooms} booked
                          </div>
                      </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              
              {/* Totals Row */}
              <tr className="bg-gray-100 font-bold border-t-4 border-gray-300">
                <td className="sticky left-0 bg-gray-100 z-10 p-4 border-r border-b text-gray-900">
                    Total Occupancy
                </td>
                {dates.map(date => {
                    const booked = getTotalBooked(date);
                    const total = getTotalRooms(date);
                    const percent = total > 0 ? Math.round((booked / total) * 100) : 0;
                    const occupancyColor = percent >= 90 ? "text-red-600" : percent >= 50 ? "text-yellow-600" : "text-green-600";

                    return (
                        <td key={date} className="p-4 text-center border-r border-b border-gray-200">
                            <div className="text-sm text-gray-900">{booked} / {total}</div>
                            <div className={`text-xs ${occupancyColor}`}>{percent}%</div>
                        </td>
                    );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
