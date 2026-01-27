import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { housekeepingAPI, userAPI, roomAPI, propertyAPI, bookingAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";
const HousekeepingPage = () => {
    const { t } = useLanguage();
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
    const [currentUser, setCurrentUser] = useState(null);
    const initialDateKey = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
    const [selectedDate, setSelectedDate] = useState(initialDateKey);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({
        title: "", description: "", priority: "NORMAL", propertyId: 0, roomId: "", assignedToUserId: ""
    });
    useEffect(() => {
        const userStr = localStorage.getItem("user");
        let roleOverride = "";
        if (userStr) {
            const u = JSON.parse(userStr);
            setCurrentUser(u);
            roleOverride = (u.role || "").toUpperCase();
            if (roleOverride === "CLEANER" && u.id) {
                setFilterAssignee(u.id);
            }
        }
        loadData(roleOverride);
    }, []);
    useEffect(() => {
        if (!assignmentPropertyId)
            return;
        const interval = setInterval(async () => {
            try {
                const tasksRes = await housekeepingAPI.getAll();
                setTasks(tasksRes.data);
                await loadAssignmentRooms(assignmentPropertyId);
            }
            catch (error) {
                console.error("Failed to refresh housekeeping data", error);
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [assignmentPropertyId]);
    const currentRole = currentUser?.role?.toUpperCase() || "";
    const isCleaner = currentRole === "CLEANER";
    const canAssign = ["ADMIN", "MANAGER", "RECEPTION"].includes(currentRole);
    const loadData = async (roleOverride) => {
        setLoading(true);
        try {
            const effectiveRole = roleOverride || currentRole;
            const shouldLoadUsers = effectiveRole !== "CLEANER";
            const tasksReq = housekeepingAPI.getAll();
            const usersReq = shouldLoadUsers ? userAPI.getAll() : Promise.resolve({ data: [] });
            const propsReq = propertyAPI.getAll();
            const bookingsReq = bookingAPI.getAll();
            const [tasksRes, usersRes, propsRes, bookingsRes] = await Promise.all([
                tasksReq,
                usersReq,
                propsReq,
                bookingsReq
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
            const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
            setTasks(updatedTasks);
            const updatedTask = updatedTasks.find(t => t.id === taskId);
            if (updatedTask?.roomId && ["COMPLETED", "INSPECTED"].includes(newStatus)) {
                await roomAPI.updateStatus(updatedTask.roomId, "AVAILABLE");
                setAssignmentRooms(prev => prev.map(r => r.id === updatedTask.roomId ? { ...r, status: "AVAILABLE" } : r));
            }
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
            ? t("hk_checkout_cleaning")
            : typeCode === "F"
                ? t("hk_occupied_stayover")
                : t("hk_no_cleaning_needed");
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
            if (typeCode === "N") {
                const updated = await housekeepingAPI.update(res.data.id, { status: "INSPECTED" });
                setTasks([updated.data, ...tasks]);
                await roomAPI.updateStatus(room.id, "AVAILABLE");
                setAssignmentRooms(prev => prev.map(r => r.id === room.id ? { ...r, status: "AVAILABLE" } : r));
                return;
            }
            setTasks([res.data, ...tasks]);
        }
        catch (error) {
            console.error("Failed quick assign", error);
        }
    };
    const handleNoCleaning = async (room) => {
        try {
            const res = await housekeepingAPI.create({
                title: `N - Room ${room.roomNumber}`,
                description: t("hk_no_cleaning_needed"),
                priority: "LOW",
                propertyId: room.propertyId,
                roomId: room.id,
                assignedToUserId: null,
            });
            const updated = await housekeepingAPI.update(res.data.id, { status: "INSPECTED" });
            setTasks([updated.data, ...tasks]);
            await roomAPI.updateStatus(room.id, "AVAILABLE");
            setAssignmentRooms(prev => prev.map(r => r.id === room.id ? { ...r, status: "AVAILABLE" } : r));
        }
        catch (error) {
            console.error("Failed to mark no cleaning", error);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm(t("hk_delete_confirm")))
            return;
        try {
            await housekeepingAPI.delete(id);
            setTasks(tasks.filter(t => t.id !== id));
        }
        catch (error) {
            console.error(error);
        }
    };
    const toDateKey = (dateStr) => new Date(dateStr).toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
    const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
    const filteredTasks = tasks.filter(t => {
        if (isCleaner && currentUser?.id && t.assignedToUserId !== currentUser.id)
            return false;
        if (!isCleaner && filterAssignee !== "ALL" && t.assignedToUserId !== filterAssignee)
            return false;
        if (filterStatus !== "ALL" && t.status !== filterStatus)
            return false;
        if (isCleaner && selectedDate) {
            const createdKey = toDateKey(t.createdAt);
            if (createdKey !== selectedDate)
                return false;
        }
        return true;
    });
    const cleanedCount = filteredTasks.filter(t => !t.title.startsWith("N - Room") && ["COMPLETED", "INSPECTED"].includes(t.status)).length;
    const getAssignmentType = (room) => {
        if (room.status === "LOCKED") {
            return { code: "P", label: t("hk_key_pending"), classes: "bg-orange-100 text-orange-800 border-orange-200" };
        }
        const taskForRoom = tasks.find(t => t.roomId === room.id &&
            (t.title.startsWith("P - Room") || t.title.startsWith("F - Room")) &&
            !["COMPLETED", "INSPECTED"].includes(t.status) &&
            toDateKey(t.createdAt) === todayKey);
        if (taskForRoom?.title.startsWith("P - Room")) {
            return { code: "P", label: t("hk_checkout_cleaning"), classes: "bg-red-100 text-red-800 border-red-200" };
        }
        if (taskForRoom?.title.startsWith("F - Room")) {
            return { code: "F", label: t("hk_occupied_stayover"), classes: "bg-purple-100 text-purple-800 border-purple-200" };
        }
        if (room.status === "DIRTY") {
            return { code: "P", label: t("hk_checkout_cleaning"), classes: "bg-red-100 text-red-800 border-red-200" };
        }
        const roomBookings = bookings.filter(b => b.roomId === room.id && ["CONFIRMED", "CHECKED_IN"].includes(b.bookingStatus));
        if (roomBookings.length === 0)
            return null;
        const checkoutBooking = roomBookings.find(b => {
            const checkoutKey = toDateKey(b.checkOutDate);
            return todayKey === checkoutKey;
        });
        if (checkoutBooking) {
            return { code: "P", label: t("hk_due_out_today"), classes: "bg-red-100 text-red-800 border-red-200" };
        }
        const activeBooking = roomBookings.find(b => {
            const checkIn = toDateKey(b.checkInDate);
            const checkOut = toDateKey(b.checkOutDate);
            return todayKey >= checkIn && todayKey < checkOut;
        });
        if (!activeBooking)
            return null;
        const checkInKey = toDateKey(activeBooking.checkInDate);
        if (todayKey === checkInKey) {
            return null;
        }
        return { code: "F", label: t("hk_occupied_stayover"), classes: "bg-purple-100 text-purple-800 border-purple-200" };
    };
    const getTaskAssignmentBadge = (task) => {
        if (task.title.startsWith("P - Room")) {
            return { code: "P", classes: "bg-red-100 text-red-800 border-red-200" };
        }
        if (task.title.startsWith("F - Room")) {
            return { code: "F", classes: "bg-purple-100 text-purple-800 border-purple-200" };
        }
        if (task.title.startsWith("N - Room")) {
            return { code: "N", classes: "bg-gray-200 text-gray-800 border-gray-300" };
        }
        return null;
    };
    const lockedAssignedTasks = tasks.filter(t => t.room?.status === "LOCKED" &&
        t.assignedToUserId &&
        !["COMPLETED", "INSPECTED"].includes(t.status));
    const handleKeyDropped = async (roomId) => {
        try {
            await roomAPI.updateStatus(roomId, "DIRTY");
            setTasks(prev => prev.map(t => t.roomId === roomId ? { ...t, room: { ...t.room, status: "DIRTY" } } : t));
            setAssignmentRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: "DIRTY" } : r));
        }
        catch (error) {
            console.error("Failed to mark key dropped", error);
        }
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
    const getStatusBackground = (s) => {
        switch (s) {
            case "COMPLETED": return "bg-green-100 border-green-300";
            case "IN_PROGRESS": return "bg-yellow-100 border-yellow-300";
            case "INSPECTED": return "bg-blue-100 border-blue-300";
            default: return "bg-gray-100 border-gray-300";
        }
    };
    const getRoomStatusHint = (task) => {
        if (task.room?.status === "LOCKED")
            return t("hk_key_pending");
        return "";
    };
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800", children: t("admin_housekeeping") }), canAssign && (_jsxs("button", { onClick: () => setIsModalOpen(true), className: "bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow-md font-bold flex items-center gap-2 transform transition hover:scale-105 w-full sm:w-auto justify-center", style: { zIndex: 10 }, children: [_jsx("span", { className: "text-xl", children: "+" }), " ", t("hk_new_task")] }))] }), _jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center", children: [canAssign && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: t("hk_property_label") }), _jsx("select", { className: "border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500 w-full sm:w-auto", value: assignmentPropertyId, onChange: (e) => {
                                    const pid = parseInt(e.target.value);
                                    setAssignmentPropertyId(pid);
                                    loadAssignmentRooms(pid);
                                }, children: properties.map(p => _jsx("option", { value: p.id, children: p.name }, p.id)) })] })), !isCleaner && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: t("hk_filter_staff") }), _jsxs("select", { className: "border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500 w-full sm:w-auto", value: filterAssignee, onChange: e => setFilterAssignee(e.target.value === "ALL" ? "ALL" : parseInt(e.target.value)), children: [_jsx("option", { value: "ALL", children: t("hk_all_staff") }), users.map(u => _jsxs("option", { value: u.id, children: [u.name, " (", u.role, ")"] }, u.id))] })] })), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: t("hk_status_label") }), _jsxs("select", { className: "border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500 w-full sm:w-auto", value: filterStatus, onChange: e => setFilterStatus(e.target.value), children: [_jsx("option", { value: "ALL", children: t("hk_all_statuses") }), _jsx("option", { value: "PENDING", children: t("hk_pending") }), _jsx("option", { value: "IN_PROGRESS", children: t("hk_in_progress") }), _jsx("option", { value: "COMPLETED", children: t("hk_completed") }), _jsx("option", { value: "INSPECTED", children: t("hk_inspected") })] })] })] }), canAssign && (_jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4", children: [_jsx("h2", { className: "text-lg font-bold text-gray-800", children: t("hk_daily_assignments") }), _jsx("span", { className: "text-xs text-gray-500", children: t("hk_daily_legend") })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: [assignmentRooms.filter(room => {
                                const assignment = getAssignmentType(room);
                                if (!assignment)
                                    return false;
                                const assignedTask = tasks.find(t => t.roomId === room.id &&
                                    t.title.startsWith(`${assignment.code} - Room`) &&
                                    t.assignedToUserId);
                                return !assignedTask;
                            }).map(room => {
                                const assignment = getAssignmentType(room);
                                if (!assignment)
                                    return null;
                                return (_jsxs("div", { className: "border rounded-lg p-4 bg-gray-50", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "font-bold text-gray-800 text-lg", children: ["Room ", room.roomNumber] }), _jsx("span", { className: `text-sm px-3 py-1 rounded border font-extrabold ${assignment.classes}`, children: assignment.code })] }), _jsx("div", { className: "text-sm text-gray-600 mb-3", children: assignment.label }), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-500", children: t("hk_assign") }), _jsxs("select", { className: "text-sm border rounded px-2 py-2 bg-white text-gray-800 focus:ring-1 focus:ring-primary-500 w-full sm:w-auto", value: "", onChange: (e) => handleQuickAssign(room, assignment.code, e.target.value), children: [_jsx("option", { value: "", children: t("hk_select_staff") }), users.map(u => (_jsx("option", { value: u.id, children: u.name }, u.id)))] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-500", children: t("hk_no_cleaning") }), _jsxs("label", { className: "inline-flex items-center gap-2 text-sm text-gray-700", children: [_jsx("input", { type: "checkbox", className: "h-4 w-4", onChange: (e) => e.target.checked && handleNoCleaning(room) }), t("hk_no_cleaning")] })] })] }, room.id));
                            }), assignmentRooms.every(r => !getAssignmentType(r)) && (_jsx("div", { className: "col-span-full text-center py-6 text-gray-400 bg-white rounded border border-dashed border-gray-200", children: t("hk_no_rooms_today") }))] })] })), canAssign && lockedAssignedTasks.length > 0 && (_jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-orange-100 mb-6", children: [_jsx("div", { className: "flex items-center justify-between mb-4", children: _jsx("h2", { className: "text-lg font-bold text-gray-800", children: t("hk_awaiting_key_drop") }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: lockedAssignedTasks.map(task => (_jsxs("div", { className: "border rounded-lg p-4 bg-orange-50", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { className: "font-bold text-gray-800", children: ["Room ", task.room?.roomNumber] }), _jsx("span", { className: "text-xs px-2 py-1 rounded border bg-orange-100 text-orange-800 border-orange-200", children: "P" })] }), _jsx("div", { className: "text-xs text-gray-500 mb-3", children: task.assignee?.name || t("hk_unassigned") }), _jsx("button", { className: "w-full bg-orange-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-orange-700", onClick: () => task.roomId && handleKeyDropped(task.roomId), children: t("hk_key_dropped") })] }, task.id))) })] })), isCleaner && (_jsxs("div", { className: "bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-sm font-medium text-gray-600", children: t("hk_cleaning_date") || "Cleaning Date" }), _jsx("input", { type: "date", className: "border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500", value: selectedDate, onChange: (e) => setSelectedDate(e.target.value) })] }), _jsxs("div", { className: "text-sm font-semibold text-gray-700", children: [t("hk_rooms_cleaned") || "Rooms cleaned", ": ", _jsx("span", { className: "text-primary-600", children: cleanedCount })] })] })), loading ? _jsx("div", { className: "text-center py-10", children: t("loading") }) : (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [filteredTasks.map(task => (_jsxs("div", { className: `rounded-lg shadow-sm border p-4 transition hover:shadow-md ${isCleaner ? getStatusBackground(task.status) : "bg-white border-gray-200"}`, children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2", children: [!isCleaner && (_jsx("span", { className: `text-xs px-2 py-1 rounded border font-bold ${getPriorityColor(task.priority)}`, children: task.priority })), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { className: `text-xs font-bold px-2 py-1 rounded cursor-pointer ${getStatusColor(task.status)} border-none outline-none focus:ring-2`, value: task.status, onChange: (e) => handleStatusChange(task.id, e.target.value), children: [_jsx("option", { value: "PENDING", className: "text-gray-800 bg-white", children: t("hk_pending") }), _jsx("option", { value: "IN_PROGRESS", className: "text-gray-800 bg-white", children: t("hk_in_progress") }), _jsx("option", { value: "COMPLETED", className: "text-gray-800 bg-white", children: t("hk_completed") }), _jsx("option", { value: "INSPECTED", className: "text-gray-800 bg-white", children: t("hk_inspected") })] }), canAssign && (_jsx("button", { onClick: () => handleDelete(task.id), className: "text-gray-400 hover:text-red-500", children: "\u00D7" }))] })] }), isCleaner ? (_jsxs("div", { className: "flex flex-col items-center text-center gap-3", children: [_jsx("div", { className: "text-3xl font-extrabold text-gray-900", children: task.room ? task.room.roomNumber : t("hk_general_task") }), _jsx("div", { className: "text-5xl font-black text-gray-800", children: getTaskAssignmentBadge(task)?.code || "" }), getRoomStatusHint(task) && (_jsx("div", { className: "text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-800 border border-orange-200", children: getRoomStatusHint(task) })), _jsx("div", { className: "text-sm font-semibold text-gray-700", children: task.assignee?.name || t("hk_unassigned") })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h3", { className: "font-bold text-gray-800", children: task.title }), getTaskAssignmentBadge(task) && (_jsx("span", { className: `text-sm px-3 py-1 rounded border font-extrabold ${getTaskAssignmentBadge(task)?.classes}`, children: getTaskAssignmentBadge(task)?.code }))] }), task.room && _jsxs("div", { className: "text-base font-semibold text-primary-600 mb-2", children: ["Room ", task.room.roomNumber] }), _jsx("p", { className: "text-sm text-gray-600 mb-4 line-clamp-2", children: task.description || t("hk_no_details") }), _jsx("div", { className: "pt-4 border-t border-gray-100 flex items-center justify-between", children: _jsxs("div", { className: "flex items-center gap-2 flex-1", children: [_jsx("span", { className: "text-xs text-gray-500", children: t("hk_assignee") }), canAssign ? (_jsxs("select", { className: "text-sm border border-gray-200 bg-white hover:bg-gray-50 rounded cursor-pointer focus:ring-1 focus:ring-primary-500 max-w-[160px] truncate px-2 py-1", value: task.assignedToUserId || "", onChange: (e) => handleAssignUser(task.id, e.target.value), children: [_jsx("option", { value: "", children: t("hk_unassigned") }), users.map(u => (_jsx("option", { value: u.id, children: u.name }, u.id)))] })) : (_jsx("span", { className: "text-sm text-gray-700 font-medium", children: task.assignee?.name || t("hk_unassigned") }))] }) })] }))] }, task.id))), filteredTasks.length === 0 && (_jsx("div", { className: "col-span-full text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300", children: t("hk_no_tasks") }))] })), isModalOpen && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-md p-6", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: t("hk_create_task_title") }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("hk_title_label") }), _jsx("input", { className: "w-full border p-2 rounded focus:ring-2 focus:ring-primary-500", value: newTask.title, onChange: e => setNewTask({ ...newTask, title: e.target.value }), placeholder: t("hk_title_label") })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("hk_property_label") }), _jsx("select", { className: "w-full border p-2 rounded", value: newTask.propertyId, onChange: e => {
                                                        const pid = parseInt(e.target.value);
                                                        setNewTask({ ...newTask, propertyId: pid });
                                                        loadRooms(pid);
                                                    }, children: properties.map(p => _jsx("option", { value: p.id, children: p.name }, p.id)) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("hk_room_optional") }), _jsxs("select", { className: "w-full border p-2 rounded", value: newTask.roomId, onChange: e => setNewTask({ ...newTask, roomId: e.target.value }), children: [_jsx("option", { value: "", children: t("hk_general_task") }), rooms.map(r => _jsx("option", { value: r.id, children: r.roomNumber }, r.id))] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("hk_assign_to") }), _jsxs("select", { className: "w-full border p-2 rounded", value: newTask.assignedToUserId, onChange: e => setNewTask({ ...newTask, assignedToUserId: e.target.value }), children: [_jsx("option", { value: "", children: t("hk_unassigned") }), users.map(u => _jsxs("option", { value: u.id, children: [u.name, " (", u.role, ")"] }, u.id))] })] }), _jsx("div", { className: "grid grid-cols-2 gap-4", children: _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("hk_priority_label") }), _jsxs("select", { className: "w-full border p-2 rounded", value: newTask.priority, onChange: e => setNewTask({ ...newTask, priority: e.target.value }), children: [_jsx("option", { value: "LOW", children: t("hk_low") }), _jsx("option", { value: "NORMAL", children: t("hk_normal") }), _jsx("option", { value: "HIGH", children: t("hk_high") }), _jsx("option", { value: "URGENT", children: t("hk_urgent") })] })] }) }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: t("hk_description_label") }), _jsx("textarea", { rows: 3, className: "w-full border p-2 rounded focus:ring-2 focus:ring-primary-500", value: newTask.description, onChange: e => setNewTask({ ...newTask, description: e.target.value }) })] })] }), _jsxs("div", { className: "mt-6 flex justify-end gap-3", children: [_jsx("button", { onClick: () => setIsModalOpen(false), className: "px-4 py-2 text-gray-600 hover:bg-gray-100 rounded", children: t("hk_cancel") }), _jsx("button", { onClick: handleCreateTask, disabled: !newTask.title, className: "px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50", children: t("hk_create_task_button") })] })] }) }))] }));
};
export default HousekeepingPage;
