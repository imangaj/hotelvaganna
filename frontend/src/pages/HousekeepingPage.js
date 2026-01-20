import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { housekeepingAPI, userAPI, roomAPI, propertyAPI, bookingAPI } from "../api/endpoints";
const HousekeepingPage = () => {
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [assignmentRooms, setAssignmentRooms] = useState([]);
    const [properties, setProperties] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assignmentPropertyId, setAssignmentPropertyId] = useState("");
    const [filterAssignee, setFilterAssignee] = useState("ALL");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: "", description: "", priority: "NORMAL", propertyId: 0, roomId: "", assignedToUserId: ""
    });
    useEffect(() => {
        loadData();
    }, []);
    const loadData = async () => {
        setLoading(true);
        try {
            const [tasksRes, usersRes, propsRes, bookingsRes] = await Promise.all([
                housekeepingAPI.getAll(),
                userAPI.getAll(),
                propertyAPI.getAll(),
                bookingAPI.getAll()
            ]);
            setTasks(tasksRes.data);
            setUsers(usersRes.data);
            setProperties(propsRes.data);
            setBookings(bookingsRes.data);
            // Default property for new task
            if (propsRes.data.length > 0) {
                setNewTask(prev => ({ ...prev, propertyId: propsRes.data[0].id }));
                loadRooms(propsRes.data[0].id);
                setAssignmentPropertyId(propsRes.data[0].id);
                loadAssignmentRooms(propsRes.data[0].id);
            }
        }
        catch (error) {
            console.error("Failed to load data", error);
        }
        finally {
            setLoading(false);
        }
    };
    const loadRooms = async (propertyId) => {
        try {
            const res = await roomAPI.getByProperty(propertyId);
            setRooms(res.data);
        }
        catch (error) {
            console.error("Failed to load rooms", error);
        }
    };
    const loadAssignmentRooms = async (propertyId) => {
        try {
            const res = await roomAPI.getByProperty(propertyId);
            setAssignmentRooms(res.data);
        }
        catch (error) {
            console.error("Failed to load assignment rooms", error);
        }
    };
    const handleCreateTask = async () => {
        try {
            await housekeepingAPI.create({
                ...newTask,
                roomId: newTask.roomId ? parseInt(newTask.roomId) : null,
                assignedToUserId: newTask.assignedToUserId ? parseInt(newTask.assignedToUserId) : null,
                priority: newTask.priority // Pass priority
            });
            setIsModalOpen(false);
            setNewTask({ title: "", description: "", priority: "NORMAL", propertyId: properties[0]?.id || 0, roomId: "", assignedToUserId: "" });
            // Refresh tasks
            const res = await housekeepingAPI.getAll();
            setTasks(res.data);
        }
        catch (error) {
            alert("Failed to create task");
            console.error(error);
        }
    };
    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await housekeepingAPI.update(taskId, { status: newStatus });
            setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        }
        catch (error) {
            console.error("Failed update status", error);
        }
    };
    const handleAssignUser = async (taskId, userId) => {
        try {
            const userIdInt = userId ? parseInt(userId) : null;
            await housekeepingAPI.update(taskId, { assignedToUserId: userIdInt });
            // Optimistic update
            const user = users.find(u => u.id === userIdInt);
            setTasks(tasks.map(t => t.id === taskId ? { ...t, assignedToUserId: userIdInt || undefined, assignee: user } : t));
        }
        catch (error) {
            console.error("Failed assign user", error);
        }
    };
    const handleQuickAssign = async (room, typeCode, userId) => {
        const userIdInt = userId ? parseInt(userId) : null;
        if (!userIdInt)
            return;
        const title = `${typeCode} - Room ${room.roomNumber}`;
        const description = typeCode === "P"
            ? "Checkout - needs cleaning"
            : "Occupied - stayover service";
        const existing = tasks.find(t => t.roomId === room.id && t.title.startsWith(`${typeCode} - Room`));
        try {
            if (existing) {
                await housekeepingAPI.update(existing.id, { assignedToUserId: userIdInt });
                const user = users.find(u => u.id === userIdInt);
                setTasks(tasks.map(t => t.id === existing.id ? { ...t, assignedToUserId: userIdInt, assignee: user } : t));
                return;
            }
            const res = await housekeepingAPI.create({
                title,
                description,
                priority: "NORMAL",
                propertyId: room.propertyId,
                roomId: room.id,
                assignedToUserId: userIdInt,
            });
            setTasks([res.data, ...tasks]);
        }
        catch (error) {
            console.error("Failed quick assign", error);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm("Delete this task?"))
            return;
        try {
            await housekeepingAPI.delete(id);
            setTasks(tasks.filter(t => t.id !== id));
        }
        catch (error) {
            console.error(error);
        }
    };
    const filteredTasks = tasks.filter(t => {
        if (filterAssignee !== "ALL" && t.assignedToUserId !== filterAssignee)
            return false;
        if (filterStatus !== "ALL" && t.status !== filterStatus)
            return false;
        return true;
    });
    const toDateKey = (dateStr) => new Date(dateStr).toISOString().split("T")[0];
    const todayKey = new Date().toISOString().split("T")[0];
    const getAssignmentType = (room) => {
        if (room.status === "DIRTY") {
            return { code: "P", label: "Checkout (Needs Cleaning)", classes: "bg-red-100 text-red-800 border-red-200" };
        }
        const roomBookings = bookings.filter(b => b.roomId === room.id && ["CONFIRMED", "CHECKED_IN"].includes(b.bookingStatus));
        if (roomBookings.length === 0)
            return null;
        const activeBooking = roomBookings.find(b => {
            const checkIn = toDateKey(b.checkInDate);
            const checkOut = toDateKey(b.checkOutDate);
            return todayKey >= checkIn && todayKey < checkOut;
        });
        if (!activeBooking)
            return null;
        const checkoutKey = toDateKey(activeBooking.checkOutDate);
        if (todayKey === checkoutKey) {
            return { code: "P", label: "Due Out Today (Checkout)", classes: "bg-red-100 text-red-800 border-red-200" };
        }
        return { code: "F", label: "Occupied (Stayover)", classes: "bg-purple-100 text-purple-800 border-purple-200" };
    };
    const getTaskAssignmentBadge = (task) => {
        if (task.title.startsWith("P - Room")) {
            return { code: "P", classes: "bg-red-100 text-red-800 border-red-200" };
        }
        if (task.title.startsWith("F - Room")) {
            return { code: "F", classes: "bg-purple-100 text-purple-800 border-purple-200" };
        }
        return null;
    };
    const getPriorityColor = (p) => {
        switch (p) {
            case "URGENT": return "bg-red-100 text-red-800 border-red-200";
            case "HIGH": return "bg-orange-100 text-orange-800 border-orange-200";
            case "LOW": return "bg-green-100 text-green-800 border-green-200";
            default: return "bg-blue-50 text-blue-800 border-blue-200";
        }
    };
    const getStatusColor = (s) => {
        switch (s) {
            case "COMPLETED": return "bg-green-500 text-white";
            case "IN_PROGRESS": return "bg-yellow-500 text-white";
            case "INSPECTED": return "bg-blue-600 text-white";
            default: return "bg-gray-400 text-white";
        }
    };
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800", children: "Housekeeping & Tasks" }), _jsxs("button", { onClick: () => setIsModalOpen(true), className: "bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 shadow-sm font-medium flex items-center gap-2", children: [_jsx("span", { children: "+" }), " New Task"] })] }), _jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Property:" }), _jsxs("select", { className: "border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500", value: assignmentPropertyId, onChange: e => {
                            const pid = parseInt(e.target.value);
                            setAssignmentPropertyId(pid);
                            loadAssignmentRooms(pid);
                        }, children: properties.map(p => _jsx("option", { value: p.id, children: p.name }, p.id)) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Filter by Staff:" }), _jsxs("select", { className: "border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500", value: filterAssignee, onChange: e => setFilterAssignee(e.target.value === "ALL" ? "ALL" : parseInt(e.target.value)), children: [_jsx("option", { value: "ALL", children: "All Staff" }), users.map(u => _jsxs("option", { value: u.id, children: [u.name, " (", u.role, ")"] }, u.id))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: "Status:" }), _jsxs("select", { className: "border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500", value: filterStatus, onChange: e => setFilterStatus(e.target.value), children: [_jsx("option", { value: "ALL", children: "All Statuses" }), _jsx("option", { value: "PENDING", children: "Pending" }), _jsx("option", { value: "IN_PROGRESS", children: "In Progress" }), _jsx("option", { value: "COMPLETED", children: "Completed" }), _jsx("option", { value: "INSPECTED", children: "Inspected" })] })] })] }), _jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-lg font-bold text-gray-800", children: "Daily Room Assignments" }), _jsx("span", { className: "text-xs text-gray-500", children: "P = Checkout / Needs Cleaning, F = Occupied / Stayover" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: [assignmentRooms.map(room => {
                            const assignment = getAssignmentType(room);
                            if (!assignment)
                                return null;
                            return (_jsxs("div", { className: "border rounded-lg p-4 bg-gray-50", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "font-bold text-gray-800", children: ["Room ", room.roomNumber] }), _jsx("span", { className: `text-xs px-2 py-1 rounded border font-bold ${assignment.classes}`, children: assignment.code })] }), _jsx("div", { className: "text-sm text-gray-600 mb-3", children: assignment.label }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-500", children: "Assign:" }), _jsxs("select", { className: "text-sm border rounded px-2 py-1 bg-white text-gray-800 focus:ring-1 focus:ring-primary-500", value: "", onChange: (e) => handleQuickAssign(room, assignment.code, e.target.value), children: [_jsx("option", { value: "", children: "Select Staff" }), users.map(u => (_jsx("option", { value: u.id, children: u.name }, u.id)))] })] })] }, room.id));
                        }), assignmentRooms.every(r => !getAssignmentType(r)) && (_jsx("div", { className: "col-span-full text-center py-6 text-gray-400 bg-white rounded border border-dashed border-gray-200", children: "No occupied or checkout rooms for today." }))] })] }), loading ? _jsx("div", { className: "text-center py-10", children: "Loading tasks..." }) : (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [filteredTasks.map(task => (_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition hover:shadow-md", children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("span", { className: `text-xs px-2 py-1 rounded border font-bold ${getPriorityColor(task.priority)}`, children: task.priority }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { className: `text-xs font-bold px-2 py-1 rounded cursor-pointer ${getStatusColor(task.status)} border-none outline-none focus:ring-2`, value: task.status, onChange: (e) => handleStatusChange(task.id, e.target.value), children: [_jsx("option", { value: "PENDING", className: "text-gray-800 bg-white", children: "Pending" }), _jsx("option", { value: "IN_PROGRESS", className: "text-gray-800 bg-white", children: "In Progress" }), _jsx("option", { value: "COMPLETED", className: "text-gray-800 bg-white", children: "Completed" }), _jsx("option", { value: "INSPECTED", className: "text-gray-800 bg-white", children: "Inspected" })] }), _jsx("button", { onClick: () => handleDelete(task.id), className: "text-gray-400 hover:text-red-500", children: "\u00D7" })] })] }), _jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h3", { className: "font-bold text-gray-800", children: task.title }), getTaskAssignmentBadge(task) && (_jsx("span", { className: `text-xs px-2 py-1 rounded border font-bold ${getTaskAssignmentBadge(task).classes}`, children: getTaskAssignmentBadge(task).code }))] }), task.room && _jsxs("div", { className: "text-sm font-semibold text-primary-600 mb-2", children: ["Room ", task.room.roomNumber] }), _jsx("p", { className: "text-sm text-gray-600 mb-4 line-clamp-2", children: task.description || "No additional details." }), _jsx("div", { className: "pt-4 border-t border-gray-100 flex items-center justify-between", children: _jsxs("div", { className: "flex items-center gap-2 flex-1", children: [_jsx("span", { className: "text-xs text-gray-500", children: "Assignee:" }), _jsxs("select", { className: "text-sm border border-gray-200 bg-white hover:bg-gray-50 rounded cursor-pointer focus:ring-1 focus:ring-primary-500 max-w-[160px] truncate px-2 py-1", value: task.assignedToUserId || "", onChange: (e) => handleAssignUser(task.id, e.target.value), children: [_jsx("option", { value: "", children: "Unassigned" }), users.map(u => (_jsx("option", { value: u.id, children: u.name }, u.id)))] })] }) })] }, task.id))), filteredTasks.length === 0 && (_jsx("div", { className: "col-span-full text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300", children: "No tasks found matching your filters." }))] })), isModalOpen && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-md p-6", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: "Create New Task" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Title" }), _jsx("input", { className: "w-full border p-2 rounded focus:ring-2 focus:ring-primary-500", value: newTask.title, onChange: e => setNewTask({ ...newTask, title: e.target.value }), placeholder: "e.g. Clean Room 101" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Property" }), _jsx("select", { className: "w-full border p-2 rounded", value: newTask.propertyId, onChange: e => {
                                                        const pid = parseInt(e.target.value);
                                                        setNewTask({ ...newTask, propertyId: pid });
                                                        loadRooms(pid);
                                                    }, children: properties.map(p => _jsx("option", { value: p.id, children: p.name }, p.id)) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Room (Optional)" }), _jsxs("select", { className: "w-full border p-2 rounded", value: newTask.roomId, onChange: e => setNewTask({ ...newTask, roomId: e.target.value }), children: [_jsx("option", { value: "", children: "General Task" }), rooms.map(r => _jsx("option", { value: r.id, children: r.roomNumber }, r.id))] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Assign To" }), _jsxs("select", { className: "w-full border p-2 rounded", value: newTask.assignedToUserId, onChange: e => setNewTask({ ...newTask, assignedToUserId: e.target.value }), children: [_jsx("option", { value: "", children: "Unassigned" }), users.map(u => _jsxs("option", { value: u.id, children: [u.name, " (", u.role, ")"] }, u.id))] })] }), _jsx("div", { className: "grid grid-cols-2 gap-4", children: _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Priority" }), _jsxs("select", { className: "w-full border p-2 rounded", value: newTask.priority, onChange: e => setNewTask({ ...newTask, priority: e.target.value }), children: [_jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "NORMAL", children: "Normal" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "URGENT", children: "Urgent" })] })] }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Description" }), _jsx("textarea", { rows: 3, className: "w-full border p-2 rounded focus:ring-2 focus:ring-primary-500", value: newTask.description, onChange: e => setNewTask({ ...newTask, description: e.target.value }) })] })] }), _jsxs("div", { className: "mt-6 flex justify-end gap-3", children: [_jsx("button", { onClick: () => setIsModalOpen(false), className: "px-4 py-2 text-gray-600 hover:bg-gray-100 rounded", children: "Cancel" }), _jsx("button", { onClick: handleCreateTask, disabled: !newTask.title, className: "px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50", children: "Create Task" })] })] }) }))] }));
};
export default HousekeepingPage;
