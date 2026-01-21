import React, { useState, useEffect } from "react";
import { housekeepingAPI, userAPI, roomAPI, propertyAPI, bookingAPI } from "../api/endpoints";
import { useLanguage } from "../contexts/LanguageContext";

interface User {
  id: number;
  name: string;
  role: string;
}

interface Room {
  id: number;
  roomNumber: string;
  propertyId: number;
    status?: string;
}

interface Property {
  id: number;
  name: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "INSPECTED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  roomId?: number;
  room?: Room;
  propertyId: number;
  assignedToUserId?: number;
  assignee?: User;
  createdAt: string;
}

interface Booking {
    id: number;
    roomId: number;
    propertyId: number;
    checkInDate: string;
    checkOutDate: string;
    bookingStatus: string;
}

const HousekeepingPage: React.FC = () => {
    const { t } = useLanguage();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [assignmentRooms, setAssignmentRooms] = useState<Room[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const [assignmentPropertyId, setAssignmentPropertyId] = useState<number | "">("");

    const [filterAssignee, setFilterAssignee] = useState<number | "ALL">("ALL");
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const initialDateKey = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
    const [selectedDate, setSelectedDate] = useState<string>(initialDateKey);

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
        if (!assignmentPropertyId) return;
        const interval = setInterval(async () => {
            try {
                const tasksRes = await housekeepingAPI.getAll();
                setTasks(tasksRes.data);
                await loadAssignmentRooms(assignmentPropertyId as number);
            } catch (error) {
                console.error("Failed to refresh housekeeping data", error);
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [assignmentPropertyId]);

    const currentRole = currentUser?.role?.toUpperCase() || "";
    const isCleaner = currentRole === "CLEANER";
    const canAssign = ["ADMIN", "MANAGER", "RECEPTION"].includes(currentRole);

    const loadData = async (roleOverride?: string) => {
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
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const loadRooms = async (propertyId: number) => {
        try {
            const res = await roomAPI.getByProperty(propertyId);
            setRooms(res.data);
        } catch (error) {
            console.error("Failed to load rooms", error);
        }
    };

    const loadAssignmentRooms = async (propertyId: number) => {
        try {
            const res = await roomAPI.getByProperty(propertyId);
            setAssignmentRooms(res.data);
        } catch (error) {
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
        } catch (error) {
            alert("Failed to create task");
            console.error(error);
        }
    };

    const handleStatusChange = async (taskId: number, newStatus: string) => {
        try {
            await housekeepingAPI.update(taskId, { status: newStatus });
            const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t);
            setTasks(updatedTasks);

            const updatedTask = updatedTasks.find(t => t.id === taskId);
            if (updatedTask?.roomId && ["COMPLETED", "INSPECTED"].includes(newStatus)) {
                await roomAPI.updateStatus(updatedTask.roomId, "AVAILABLE");
                setAssignmentRooms(prev => prev.map(r => r.id === updatedTask.roomId ? { ...r, status: "AVAILABLE" } : r));
            }
        } catch (error) {
            console.error("Failed update status", error);
        }
    };

    const handleAssignUser = async (taskId: number, userId: string) => {
         try {
            const userIdInt = userId ? parseInt(userId) : null;
            await housekeepingAPI.update(taskId, { assignedToUserId: userIdInt });
            // Optimistic update
            const user = users.find(u => u.id === userIdInt);
            setTasks(tasks.map(t => t.id === taskId ? { ...t, assignedToUserId: userIdInt || undefined, assignee: user } : t));
        } catch (error) {
            console.error("Failed assign user", error);
        }
    };

    const handleQuickAssign = async (room: Room, typeCode: "P" | "F" | "N", userId: string) => {
        const userIdInt = userId ? parseInt(userId) : null;
        if (!userIdInt) return;

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
        } catch (error) {
            console.error("Failed quick assign", error);
        }
    };

    const handleNoCleaning = async (room: Room) => {
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
        } catch (error) {
            console.error("Failed to mark no cleaning", error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t("hk_delete_confirm"))) return;
        try {
            await housekeepingAPI.delete(id);
            setTasks(tasks.filter(t => t.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const toDateKey = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
    const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });

    const filteredTasks = tasks.filter(t => {
        if (isCleaner && currentUser?.id && t.assignedToUserId !== currentUser.id) return false;
        if (!isCleaner && filterAssignee !== "ALL" && t.assignedToUserId !== filterAssignee) return false;
        if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
        if (isCleaner && selectedDate) {
            const createdKey = toDateKey(t.createdAt);
            if (createdKey !== selectedDate) return false;
        }
        return true;
    });

    const cleanedCount = filteredTasks.filter(t => !t.title.startsWith("N - Room") && ["COMPLETED", "INSPECTED"].includes(t.status)).length;

    const getAssignmentType = (room: Room): { code: "P" | "F"; label: string; classes: string } | null => {
        if (room.status === "LOCKED") {
            return { code: "P", label: t("hk_key_pending"), classes: "bg-orange-100 text-orange-800 border-orange-200" };
        }
        const taskForRoom = tasks.find(t =>
            t.roomId === room.id &&
            (t.title.startsWith("P - Room") || t.title.startsWith("F - Room")) &&
            !["COMPLETED", "INSPECTED"].includes(t.status) &&
            toDateKey(t.createdAt) === todayKey
        );
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
        if (roomBookings.length === 0) return null;

        const activeBooking = roomBookings.find(b => {
            const checkIn = toDateKey(b.checkInDate);
            const checkOut = toDateKey(b.checkOutDate);
            return todayKey >= checkIn && todayKey < checkOut;
        });

        if (!activeBooking) return null;

        const checkInKey = toDateKey(activeBooking.checkInDate);
        if (todayKey === checkInKey) {
            return null;
        }

        const checkoutKey = toDateKey(activeBooking.checkOutDate);
        if (todayKey === checkoutKey) {
            return { code: "P", label: t("hk_due_out_today"), classes: "bg-red-100 text-red-800 border-red-200" };
        }

        return { code: "F", label: t("hk_occupied_stayover"), classes: "bg-purple-100 text-purple-800 border-purple-200" };
    };

    const getTaskAssignmentBadge = (task: Task): { code: "P" | "F" | "N"; classes: string } | null => {
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

    const lockedAssignedTasks = tasks.filter(t =>
        t.room?.status === "LOCKED" &&
        t.assignedToUserId &&
        !["COMPLETED", "INSPECTED"].includes(t.status)
    );

    const handleKeyDropped = async (roomId: number) => {
        try {
            await roomAPI.updateStatus(roomId, "DIRTY");
            setTasks(prev => prev.map(t => t.roomId === roomId ? { ...t, room: { ...t.room!, status: "DIRTY" } } : t));
            setAssignmentRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: "DIRTY" } : r));
        } catch (error) {
            console.error("Failed to mark key dropped", error);
        }
    };

    const getPriorityColor = (p: string) => {
        switch(p) {
            case "URGENT": return "bg-red-100 text-red-800 border-red-200";
            case "HIGH": return "bg-orange-100 text-orange-800 border-orange-200";
            case "LOW": return "bg-green-100 text-green-800 border-green-200";
            default: return "bg-blue-50 text-blue-800 border-blue-200";
        }
    };

    const getStatusColor = (s: string) => {
        switch(s) {
            case "COMPLETED": return "bg-green-500 text-white";
            case "IN_PROGRESS": return "bg-yellow-500 text-white";
            case "INSPECTED": return "bg-blue-600 text-white";
            default: return "bg-gray-400 text-white";
        }
    };

    const getStatusBackground = (s: string) => {
        switch(s) {
            case "COMPLETED": return "bg-green-100 border-green-300";
            case "IN_PROGRESS": return "bg-yellow-100 border-yellow-300";
            case "INSPECTED": return "bg-blue-100 border-blue-300";
            default: return "bg-gray-100 border-gray-300";
        }
    };

    const getRoomStatusHint = (task: Task) => {
        if (task.room?.status === "LOCKED") return t("hk_key_pending");
        return "";
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{t("admin_housekeeping")}</h1>
                {canAssign && (
                    <button 
                      onClick={() => setIsModalOpen(true)} 
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 shadow-md font-bold flex items-center gap-2 transform transition hover:scale-105 w-full sm:w-auto justify-center"
                      style={{ zIndex: 10 }}
                    >
                        <span className="text-xl">+</span> {t("hk_new_task")}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
                {canAssign && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">{t("hk_property_label")}</span>
                        <select
                            className="border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500 w-full sm:w-auto"
                            value={assignmentPropertyId}
                            onChange={(e) => {
                                const pid = parseInt(e.target.value);
                                setAssignmentPropertyId(pid);
                                loadAssignmentRooms(pid);
                            }}
                        >
                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}
                {!isCleaner && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">{t("hk_filter_staff")}</span>
                        <select className="border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500 w-full sm:w-auto" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value === "ALL" ? "ALL" : parseInt(e.target.value))}>
                            <option value="ALL">{t("hk_all_staff")}</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                        </select>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">{t("hk_status_label")}</span>
                    <select className="border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500 w-full sm:w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="ALL">{t("hk_all_statuses")}</option>
                        <option value="PENDING">{t("hk_pending")}</option>
                        <option value="IN_PROGRESS">{t("hk_in_progress")}</option>
                        <option value="COMPLETED">{t("hk_completed")}</option>
                        <option value="INSPECTED">{t("hk_inspected")}</option>
                    </select>
                </div>
            </div>

            {/* Daily Assignments */}
            {canAssign && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <h2 className="text-lg font-bold text-gray-800">{t("hk_daily_assignments")}</h2>
                        <span className="text-xs text-gray-500">{t("hk_daily_legend")}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assignmentRooms.filter(room => {
                            const assignment = getAssignmentType(room);
                            if (!assignment) return false;
                            const assignedTask = tasks.find(t =>
                                t.roomId === room.id &&
                                t.title.startsWith(`${assignment.code} - Room`) &&
                                t.assignedToUserId
                            );
                            return !assignedTask;
                        }).map(room => {
                            const assignment = getAssignmentType(room);
                            if (!assignment) return null;
                            return (
                                <div key={room.id} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="font-bold text-gray-800 text-lg">Room {room.roomNumber}</div>
                                        <span className={`text-sm px-3 py-1 rounded border font-extrabold ${assignment.classes}`}>{assignment.code}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 mb-3">{assignment.label}</div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <span className="text-xs text-gray-500">{t("hk_assign")}</span>
                                        <select
                                            className="text-sm border rounded px-2 py-2 bg-white text-gray-800 focus:ring-1 focus:ring-primary-500 w-full sm:w-auto"
                                            value={""}
                                            onChange={(e) => handleQuickAssign(room, assignment.code, e.target.value)}
                                        >
                                            <option value="">{t("hk_select_staff")}</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <span className="text-xs text-gray-500">{t("hk_no_cleaning")}</span>
                                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                onChange={(e) => e.target.checked && handleNoCleaning(room)}
                                            />
                                            {t("hk_no_cleaning")}
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                        {assignmentRooms.every(r => !getAssignmentType(r)) && (
                            <div className="col-span-full text-center py-6 text-gray-400 bg-white rounded border border-dashed border-gray-200">
                                {t("hk_no_rooms_today")}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Awaiting Key Drop */}
            {canAssign && lockedAssignedTasks.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">{t("hk_awaiting_key_drop")}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lockedAssignedTasks.map(task => (
                            <div key={task.id} className="border rounded-lg p-4 bg-orange-50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-bold text-gray-800">Room {task.room?.roomNumber}</div>
                                    <span className="text-xs px-2 py-1 rounded border bg-orange-100 text-orange-800 border-orange-200">P</span>
                                </div>
                                <div className="text-xs text-gray-500 mb-3">{task.assignee?.name || t("hk_unassigned")}</div>
                                <button
                                    className="w-full bg-orange-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-orange-700"
                                    onClick={() => task.roomId && handleKeyDropped(task.roomId)}
                                >
                                    {t("hk_key_dropped")}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cleaner Tools */}
            {isCleaner && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">{t("hk_cleaning_date") || "Cleaning Date"}</span>
                        <input
                            type="date"
                            className="border rounded p-2 text-sm focus:ring-2 focus:ring-primary-500"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <div className="text-sm font-semibold text-gray-700">
                        {t("hk_rooms_cleaned") || "Rooms cleaned"}: <span className="text-primary-600">{cleanedCount}</span>
                    </div>
                </div>
            )}

            {/* Task Grid */}
            {loading ? <div className="text-center py-10">{t("loading")}</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTasks.map(task => (
                        <div key={task.id} className={`rounded-lg shadow-sm border p-4 transition hover:shadow-md ${isCleaner ? getStatusBackground(task.status) : "bg-white border-gray-200"}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                {!isCleaner && (
                                    <span className={`text-xs px-2 py-1 rounded border font-bold ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                )}
                                <div className="flex items-center gap-2">
                                    <select 
                                        className={`text-xs font-bold px-2 py-1 rounded cursor-pointer ${getStatusColor(task.status)} border-none outline-none focus:ring-2`}
                                        value={task.status}
                                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                    >
                                        <option value="PENDING" className="text-gray-800 bg-white">{t("hk_pending")}</option>
                                        <option value="IN_PROGRESS" className="text-gray-800 bg-white">{t("hk_in_progress")}</option>
                                        <option value="COMPLETED" className="text-gray-800 bg-white">{t("hk_completed")}</option>
                                        <option value="INSPECTED" className="text-gray-800 bg-white">{t("hk_inspected")}</option>
                                    </select>
                                    {canAssign && (
                                        <button onClick={() => handleDelete(task.id)} className="text-gray-400 hover:text-red-500">×</button>
                                    )}
                                </div>
                            </div>

                            {isCleaner ? (
                                <div className="flex flex-col items-center text-center gap-3">
                                    <div className="text-3xl font-extrabold text-gray-900">
                                        {task.room ? task.room.roomNumber : t("hk_general_task")}
                                    </div>
                                    <div className="text-5xl font-black text-gray-800">
                                        {getTaskAssignmentBadge(task)?.code || ""}
                                    </div>
                                    {getRoomStatusHint(task) && (
                                        <div className="text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-800 border border-orange-200">
                                            {getRoomStatusHint(task)}
                                        </div>
                                    )}
                                    <div className="text-sm font-semibold text-gray-700">
                                        {task.assignee?.name || t("hk_unassigned")}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-gray-800">{task.title}</h3>
                                        {getTaskAssignmentBadge(task) && (
                                            <span className={`text-sm px-3 py-1 rounded border font-extrabold ${getTaskAssignmentBadge(task)?.classes}`}>
                                                {getTaskAssignmentBadge(task)?.code}
                                            </span>
                                        )}
                                    </div>
                                    {task.room && <div className="text-base font-semibold text-primary-600 mb-2">Room {task.room.roomNumber}</div>}
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{task.description || t("hk_no_details")}</p>
                                    
                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="text-xs text-gray-500">{t("hk_assignee")}</span>
                                            {canAssign ? (
                                                <select 
                                                    className="text-sm border border-gray-200 bg-white hover:bg-gray-50 rounded cursor-pointer focus:ring-1 focus:ring-primary-500 max-w-[160px] truncate px-2 py-1"
                                                    value={task.assignedToUserId || ""}
                                                    onChange={(e) => handleAssignUser(task.id, e.target.value)}
                                                >
                                                    <option value="">{t("hk_unassigned")}</option>
                                                    {users.map(u => (
                                                        <option key={u.id} value={u.id}>{u.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-sm text-gray-700 font-medium">
                                                    {task.assignee?.name || t("hk_unassigned")}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {filteredTasks.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            {t("hk_no_tasks")}
                        </div>
                    )}
                </div>
            )}

            {/* New Task Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">{t("hk_create_task_title")}</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("hk_title_label")}</label>
                                <input className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-500" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder={t("hk_title_label")} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("hk_property_label")}</label>
                                    <select className="w-full border p-2 rounded" value={newTask.propertyId} onChange={e => {
                                        const pid = parseInt(e.target.value);
                                        setNewTask({...newTask, propertyId: pid});
                                        loadRooms(pid);
                                    }}>
                                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("hk_room_optional")}</label>
                                    <select className="w-full border p-2 rounded" value={newTask.roomId} onChange={e => setNewTask({...newTask, roomId: e.target.value})}>
                                        <option value="">{t("hk_general_task")}</option>
                                        {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("hk_assign_to")}</label>
                                <select className="w-full border p-2 rounded" value={newTask.assignedToUserId} onChange={e => setNewTask({...newTask, assignedToUserId: e.target.value})}>
                                    <option value="">{t("hk_unassigned")}</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("hk_priority_label")}</label>
                                    <select className="w-full border p-2 rounded" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                                        <option value="LOW">{t("hk_low")}</option>
                                        <option value="NORMAL">{t("hk_normal")}</option>
                                        <option value="HIGH">{t("hk_high")}</option>
                                        <option value="URGENT">{t("hk_urgent")}</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("hk_description_label")}</label>
                                <textarea rows={3} className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-500" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">{t("hk_cancel")}</button>
                            <button onClick={handleCreateTask} disabled={!newTask.title} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">{t("hk_create_task_button")}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HousekeepingPage;
