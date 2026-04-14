import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppUser,
  AttendanceItem,
  LocationMaster,
  ScheduleItem,
  deleteSchedule,
  fetchAttendance,
  fetchLocations,
  fetchSchedules,
  fetchUsers,
  upsertAttendance,
  upsertSchedule
} from "../features/admin/api";
import { logout } from "../features/auth/api";
import { supabase } from "../lib/supabase";

type AdminTab = "dashboard" | "schedule" | "attendance";

interface ScheduleForm {
  id?: number;
  schedule_date: string;
  start_time: string;
  end_time: string;
  title: string;
  location_id: string;
  description: string;
}

const EMPTY_FORM: ScheduleForm = {
  schedule_date: "",
  start_time: "",
  end_time: "",
  title: "",
  location_id: "",
  description: ""
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState("");
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(EMPTY_FORM);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState("");
  const [editingAttendance, setEditingAttendance] = useState<Record<string, "present" | "absent" | "late">>({});
  const [adminName, setAdminName] = useState("Admin");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setPageMessage("");
    const [usersResult, locationsResult, schedulesResult, attendanceResult] = await Promise.allSettled([
      fetchUsers(),
      fetchLocations(),
      fetchSchedules(),
      fetchAttendance()
    ]);

    const errors: string[] = [];

    if (usersResult.status === "fulfilled") {
      setUsers(usersResult.value);
    } else {
      errors.push(usersResult.reason instanceof Error ? usersResult.reason.message : "Failed to load users");
    }

    if (locationsResult.status === "fulfilled") {
      setLocations(locationsResult.value);
    } else {
      errors.push(
        locationsResult.reason instanceof Error ? locationsResult.reason.message : "Failed to load locations"
      );
    }

    if (schedulesResult.status === "fulfilled") {
      setSchedules(schedulesResult.value);
      if (!selectedAttendanceDate && schedulesResult.value[0]?.schedule_date) {
        setSelectedAttendanceDate(schedulesResult.value[0].schedule_date);
      }
    } else {
      errors.push(
        schedulesResult.reason instanceof Error ? schedulesResult.reason.message : "Failed to load schedules"
      );
    }

    if (attendanceResult.status === "fulfilled") {
      setAttendance(attendanceResult.value);
    } else {
      errors.push(
        attendanceResult.reason instanceof Error ? attendanceResult.reason.message : "Failed to load attendance"
      );
    }

    if (errors.length > 0) {
      setPageMessage(errors.join(" | "));
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const resolveAdminName = async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) {
        return;
      }
      const currentAdmin = users.find((user) => user.id === userId);
      if (currentAdmin) {
        setAdminName(currentAdmin.full_name);
      }
    };
    void resolveAdminName();
  }, [users]);

  const players = useMemo(
    () => users.filter((user) => user.role === "player" && user.is_active_player),
    [users]
  );

  const schedulesByDate = useMemo(() => {
    return schedules.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
      if (!acc[item.schedule_date]) {
        acc[item.schedule_date] = [];
      }
      acc[item.schedule_date].push(item);
      return acc;
    }, {});
  }, [schedules]);

  const attendanceByPlayer = useMemo(() => {
    const byPlayer: Record<string, { present: number; total: number }> = {};
    players.forEach((player) => {
      byPlayer[player.id] = { present: 0, total: 0 };
    });
    attendance.forEach((item) => {
      if (!byPlayer[item.user_id]) {
        return;
      }
      byPlayer[item.user_id].total += 1;
      if (item.status === "present") {
        byPlayer[item.user_id].present += 1;
      }
    });
    return byPlayer;
  }, [attendance, players]);

  const locationNameById = useMemo(() => {
    return locations.reduce<Record<number, string>>((acc, item) => {
      acc[item.id] = item.facility_name;
      return acc;
    }, {});
  }, [locations]);

  const monthlyAttendanceCounts = useMemo(() => {
    return attendance.reduce<Record<string, number>>((acc, item) => {
      const month = item.attendance_date.slice(0, 7);
      acc[month] = (acc[month] ?? 0) + 1;
      return acc;
    }, {});
  }, [attendance]);

  const schedulesForDate = selectedAttendanceDate ? schedulesByDate[selectedAttendanceDate] ?? [] : [];
  const firstScheduleForDate = schedulesForDate[0];

  const handleScheduleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageMessage("");
    const { data } = await supabase.auth.getUser();
    const currentUserId = data.user?.id;
    if (!currentUserId) {
      setPageMessage("No authenticated admin user found.");
      return;
    }

    try {
      await upsertSchedule({
        id: scheduleForm.id,
        schedule_date: scheduleForm.schedule_date,
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        title: scheduleForm.title,
        location_id: scheduleForm.location_id ? Number(scheduleForm.location_id) : null,
        description: scheduleForm.description,
        created_by: currentUserId
      });
      setScheduleForm(EMPTY_FORM);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save schedule.";
      setPageMessage(message);
    }
  };

  const handleEditSchedule = (item: ScheduleItem) => {
    setScheduleForm({
      id: item.id,
      schedule_date: item.schedule_date,
      start_time: item.start_time ?? "",
      end_time: item.end_time ?? "",
      title: item.title,
      location_id: item.location_id ? String(item.location_id) : "",
      description: item.description ?? ""
    });
    setActiveTab("schedule");
  };

  const handleDeleteSchedule = async (id: number) => {
    setPageMessage("");
    try {
      await deleteSchedule(id);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete schedule.";
      setPageMessage(message);
    }
  };

  const attendanceRows = players.map((player) => {
    const existing = attendance.find(
      (item) => item.user_id === player.id && item.attendance_date === selectedAttendanceDate
    );
    const status = editingAttendance[player.id] ?? existing?.status ?? "absent";
    return { player, status };
  });

  const handleSaveAttendance = async () => {
    if (!selectedAttendanceDate || !firstScheduleForDate) {
      setPageMessage("Select a date that has at least one schedule.");
      return;
    }
    setPageMessage("");
    try {
      await Promise.all(
        attendanceRows.map((row) =>
          upsertAttendance({
            schedule_id: firstScheduleForDate.id,
            user_id: row.player.id,
            attendance_date: selectedAttendanceDate,
            status: row.status,
            note: ""
          })
        )
      );
      setEditingAttendance({});
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save attendance.";
      setPageMessage(message);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">FC</div>
          <div>
            <p className="brand-name">Brothers FC</p>
            <p className="brand-sub">Soccer Schedule Management</p>
          </div>
        </div>
        <nav className="menu">
          <button className={`menu-item ${activeTab === "dashboard" ? "menu-item-active" : ""}`} onClick={() => setActiveTab("dashboard")}>
            Dashboard
          </button>
          <button className={`menu-item ${activeTab === "schedule" ? "menu-item-active" : ""}`} onClick={() => setActiveTab("schedule")}>
            Schedule
          </button>
          <button className={`menu-item ${activeTab === "attendance" ? "menu-item-active" : ""}`} onClick={() => setActiveTab("attendance")}>
            Attendance
          </button>
        </nav>
        <div className="profile">
          <div className="avatar">{adminName.slice(0, 1).toUpperCase()}</div>
          <span>{adminName}</span>
          <button className="button button-logout-top" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      <section className="content-card">
        {loading ? <p>Loading...</p> : null}
        {pageMessage ? <p className="message-error">{pageMessage}</p> : null}

        {!loading && activeTab === "dashboard" ? (
          <section className="section">
            <h2 className="section-title">Attendance by Date</h2>
            <ul className="list">
              {Object.entries(schedulesByDate).map(([date, dateSchedules]) => (
                <li key={date}>
                  {date} - {dateSchedules.length} schedule(s)
                </li>
              ))}
            </ul>
            <h2 className="section-title">Attendance by Month</h2>
            <ul className="list">
              {Object.entries(monthlyAttendanceCounts).map(([month, count]) => (
                <li key={month}>
                  {month} - {count} attendance record(s)
                </li>
              ))}
            </ul>
            <h2 className="section-title">Player Attendance Rate</h2>
            <ul className="list">
              {players.map((player) => {
                const stat = attendanceByPlayer[player.id] ?? { present: 0, total: 0 };
                const rate = stat.total === 0 ? 0 : Math.round((stat.present / stat.total) * 100);
                return (
                  <li key={player.id}>
                    {player.full_name} ({player.player_id ?? "-"}) - {rate}% ({stat.present}/{stat.total})
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {!loading && activeTab === "schedule" ? (
          <section className="section">
            <h2 className="section-title">Schedule Maintenance</h2>
            <form className="form" onSubmit={handleScheduleSubmit}>
              <label className="label">
                Date
                <input
                  className="input"
                  type="date"
                  value={scheduleForm.schedule_date}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, schedule_date: event.target.value }))}
                  required
                />
              </label>
              <label className="label">
                Title
                <input
                  className="input"
                  value={scheduleForm.title}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </label>
              <label className="label">
                Start time
                <input
                  className="input"
                  type="time"
                  value={scheduleForm.start_time}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, start_time: event.target.value }))}
                />
              </label>
              <label className="label">
                End time
                <input
                  className="input"
                  type="time"
                  value={scheduleForm.end_time}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, end_time: event.target.value }))}
                />
              </label>
              <label className="label">
                Location
                <select
                  className="input"
                  value={scheduleForm.location_id}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, location_id: event.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.facility_name}
                      {!location.is_active ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
                {locations.length === 0 ? (
                  <span className="helper-text">No location records loaded. Please check location_master data/RLS.</span>
                ) : null}
              </label>
              <label className="label">
                Description
                <textarea
                  className="input"
                  value={scheduleForm.description}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <button className="button" type="submit">
                {scheduleForm.id ? "Update Schedule" : "Create Schedule"}
              </button>
            </form>
            <h3 className="section-title">Monthly View (list)</h3>
            <ul className="list">
              {schedules.map((item) => (
                <li key={item.id}>
                  {item.schedule_date} {item.start_time ?? "--:--"} - {item.title} (
                  {item.location_id ? locationNameById[item.location_id] : "No location"})
                  <div className="inline-actions">
                    <button className="button button-secondary" onClick={() => handleEditSchedule(item)}>
                      Edit
                    </button>
                    <button className="button button-secondary" onClick={() => void handleDeleteSchedule(item.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!loading && activeTab === "attendance" ? (
          <section className="section">
            <h2 className="section-title">Daily Attendance</h2>
            <label className="label">
              Date
              <input
                className="input"
                type="date"
                value={selectedAttendanceDate}
                onChange={(event) => setSelectedAttendanceDate(event.target.value)}
              />
            </label>
            <table className="table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRows.map((row) => (
                  <tr key={row.player.id}>
                    <td>{row.player.full_name}</td>
                    <td>
                      <select
                        className="input"
                        value={row.status}
                        onChange={(event) =>
                          setEditingAttendance((prev) => ({
                            ...prev,
                            [row.player.id]: event.target.value as "present" | "absent" | "late"
                          }))
                        }
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Total players: {attendanceRows.length}</p>
            <button className="button" onClick={() => void handleSaveAttendance()}>
              Save Daily Attendance
            </button>
            {!firstScheduleForDate ? (
              <p className="subtitle">No schedule found on this date. Save is disabled by validation.</p>
            ) : null}
            {schedulesForDate.length > 1 ? (
              <p className="subtitle">Multiple schedules found on this date. Attendance is linked to the first schedule.</p>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
