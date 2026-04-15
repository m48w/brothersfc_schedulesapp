import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AppUser,
  AttendanceItem,
  CategoryMaster,
  LocationMaster,
  ScheduleItem,
  deleteSchedule,
  fetchAttendance,
  fetchCategories,
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
  category_id: string;
  location_id: string;
  description: string;
}

const EMPTY_FORM: ScheduleForm = {
  schedule_date: "",
  start_time: "",
  end_time: "",
  category_id: "",
  location_id: "",
  description: ""
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState("");
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(EMPTY_FORM);
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [selectedScheduleMonth, setSelectedScheduleMonth] = useState("");
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState("");
  const [selectedDashboardMonth, setSelectedDashboardMonth] = useState("");
  const [savingAttendanceKey, setSavingAttendanceKey] = useState("");
  const [adminName, setAdminName] = useState("Admin");
  const [currentTime, setCurrentTime] = useState(() => new Date());

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
    const [usersResult, locationsResult, categoriesResult, schedulesResult, attendanceResult] = await Promise.allSettled([
      fetchUsers(),
      fetchLocations(),
      fetchCategories(),
      fetchSchedules(),
      fetchAttendance()
    ]);

    const errors: string[] = [];

    if (usersResult.status === "fulfilled") {
      setUsers(usersResult.value);
    } else {
      errors.push(usersResult.reason instanceof Error ? usersResult.reason.message : t("errorLoadUsers"));
    }

    if (locationsResult.status === "fulfilled") {
      setLocations(locationsResult.value);
    } else {
      errors.push(
        locationsResult.reason instanceof Error ? locationsResult.reason.message : t("errorLoadLocations")
      );
    }

    if (categoriesResult.status === "fulfilled") {
      setCategories(categoriesResult.value);
    } else {
      errors.push(
        categoriesResult.reason instanceof Error ? categoriesResult.reason.message : t("errorLoadCategories")
      );
    }

    if (schedulesResult.status === "fulfilled") {
      setSchedules(schedulesResult.value);
    } else {
      errors.push(
        schedulesResult.reason instanceof Error ? schedulesResult.reason.message : t("errorLoadSchedules")
      );
    }

    if (attendanceResult.status === "fulfilled") {
      setAttendance(attendanceResult.value);
    } else {
      errors.push(
        attendanceResult.reason instanceof Error ? attendanceResult.reason.message : t("errorLoadAttendance")
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
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
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

  const locationNameById = useMemo(() => {
    return locations.reduce<Record<number, string>>((acc, item) => {
      acc[item.id] = item.facility_name;
      return acc;
    }, {});
  }, [locations]);

  const categoryById = useMemo(() => {
    return categories.reduce<Record<number, CategoryMaster>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [categories]);

  const scheduleMonths = useMemo(() => {
    return Array.from(new Set(schedules.map((item) => item.schedule_date.slice(0, 7)))).sort();
  }, [schedules]);

  const schedulesByMonth = useMemo(() => {
    return schedules.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
      const month = item.schedule_date.slice(0, 7);
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(item);
      return acc;
    }, {});
  }, [schedules]);

  const attendanceByScheduleAndUser = useMemo(() => {
    return attendance.reduce<Record<string, AttendanceItem>>((acc, item) => {
      acc[`${item.schedule_id}:${item.user_id}`] = item;
      return acc;
    }, {});
  }, [attendance]);

  const playerNameById = useMemo(() => {
    return players.reduce<Record<string, string>>((acc, player) => {
      acc[player.id] = player.full_name;
      return acc;
    }, {});
  }, [players]);

  useEffect(() => {
    if (scheduleMonths.length === 0) {
      if (selectedScheduleMonth) {
        setSelectedScheduleMonth("");
      }
      return;
    }
    if (!selectedScheduleMonth || !scheduleMonths.includes(selectedScheduleMonth)) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      setSelectedScheduleMonth(
        scheduleMonths.includes(currentMonth) ? currentMonth : scheduleMonths[0]
      );
    }
  }, [scheduleMonths, selectedScheduleMonth]);

  useEffect(() => {
    if (scheduleMonths.length === 0) {
      if (selectedAttendanceMonth) {
        setSelectedAttendanceMonth("");
      }
      if (selectedDashboardMonth) {
        setSelectedDashboardMonth("");
      }
      return;
    }
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!selectedAttendanceMonth || !scheduleMonths.includes(selectedAttendanceMonth)) {
      setSelectedAttendanceMonth(scheduleMonths.includes(currentMonth) ? currentMonth : scheduleMonths[0]);
    }
    if (!selectedDashboardMonth || !scheduleMonths.includes(selectedDashboardMonth)) {
      setSelectedDashboardMonth(scheduleMonths.includes(currentMonth) ? currentMonth : scheduleMonths[0]);
    }
  }, [scheduleMonths, selectedAttendanceMonth, selectedDashboardMonth]);

  const monthlySchedules = selectedScheduleMonth ? schedulesByMonth[selectedScheduleMonth] ?? [] : [];
  const monthlyAttendanceSchedules = selectedAttendanceMonth ? schedulesByMonth[selectedAttendanceMonth] ?? [] : [];
  const selectedMonthDate = selectedScheduleMonth ? new Date(`${selectedScheduleMonth}-01T00:00:00`) : null;
  const selectedMonthLabel = selectedMonthDate
    ? new Intl.DateTimeFormat(i18n.language === "ja" ? "ja-JP" : "en-US", {
        month: i18n.language === "ja" ? "numeric" : "long"
      }).format(selectedMonthDate)
    : "";
  const monthlyScheduleTitle = selectedMonthLabel
    ? t("monthlyTrainingScheduleTitle", { month: selectedMonthLabel })
    : t("monthlyView");

  const nextPracticeOrMatch = useMemo(() => {
    return schedules.find((item) => {
      const categoryCode = categoryById[item.category_id]?.category_code;
      if (categoryCode !== "practice" && categoryCode !== "match") {
        return false;
      }
      const scheduleDateTime = new Date(`${item.schedule_date}T${item.start_time ?? "00:00"}`);
      return scheduleDateTime.getTime() >= currentTime.getTime();
    }) ?? null;
  }, [categoryById, currentTime, schedules]);

  const nextPracticeOrMatchDateTime = nextPracticeOrMatch
    ? new Date(`${nextPracticeOrMatch.schedule_date}T${nextPracticeOrMatch.start_time ?? "00:00"}`)
    : null;

  const nextPracticeOrMatchParticipants = useMemo(() => {
    if (!nextPracticeOrMatch) {
      return [];
    }
    return attendance
      .filter(
        (item) =>
          item.schedule_id === nextPracticeOrMatch.id && (item.status === "present" || item.status === "late")
      )
      .map((item) => playerNameById[item.user_id])
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b, i18n.language === "ja" ? "ja" : "en"));
  }, [attendance, i18n.language, nextPracticeOrMatch, playerNameById]);

  const nextEvent = useMemo(() => {
    return schedules.find((item) => {
      const categoryCode = categoryById[item.category_id]?.category_code;
      if (categoryCode !== "event") {
        return false;
      }
      const scheduleDateTime = new Date(`${item.schedule_date}T${item.start_time ?? "00:00"}`);
      return scheduleDateTime.getTime() >= currentTime.getTime();
    }) ?? null;
  }, [categoryById, currentTime, schedules]);

  const nextEventDateTime = nextEvent
    ? new Date(`${nextEvent.schedule_date}T${nextEvent.start_time ?? "00:00"}`)
    : null;

  const nextEventParticipants = useMemo(() => {
    if (!nextEvent) {
      return [];
    }
    return attendance
      .filter(
        (item) => item.schedule_id === nextEvent.id && (item.status === "present" || item.status === "late")
      )
      .map((item) => playerNameById[item.user_id])
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b, i18n.language === "ja" ? "ja" : "en"));
  }, [attendance, i18n.language, nextEvent, playerNameById]);

  const dashboardAttendanceRates = useMemo(() => {
    const targetSchedules = selectedDashboardMonth ? schedulesByMonth[selectedDashboardMonth] ?? [] : [];
    const targetIds = new Set(targetSchedules.map((item) => item.id));
    return players.map((player) => {
      const playerAttendance = attendance.filter(
        (item) => targetIds.has(item.schedule_id) && item.user_id === player.id
      );
      const attended = playerAttendance.filter(
        (item) => item.status === "present" || item.status === "late"
      ).length;
      const total = targetSchedules.length;
      const rate = total === 0 ? 0 : Math.round((attended / total) * 100);
      return {
        player,
        attended,
        total,
        rate
      };
    });
  }, [attendance, players, schedulesByMonth, selectedDashboardMonth]);

  const attendanceScheduleCards = useMemo(() => {
    return monthlyAttendanceSchedules.map((schedule) => {
      const rows = players.map((player) => {
        const record = attendanceByScheduleAndUser[`${schedule.id}:${player.id}`];
        const status = record?.status ?? "absent";
        return {
          player,
          status
        };
      });
      const participants = rows
        .filter((row) => row.status === "present" || row.status === "late")
        .map((row) => row.player.full_name);
      return {
        schedule,
        rows,
        participants
      };
    });
  }, [attendanceByScheduleAndUser, monthlyAttendanceSchedules, players]);

  const resetScheduleForm = () => {
    setScheduleForm(EMPTY_FORM);
    setIsScheduleFormOpen(false);
  };

  const handleScheduleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageMessage("");
    const { data } = await supabase.auth.getUser();
    const currentUserId = data.user?.id;
    if (!currentUserId) {
      setPageMessage(t("errorNoAuthAdmin"));
      return;
    }

    try {
      await upsertSchedule({
        id: scheduleForm.id,
        schedule_date: scheduleForm.schedule_date,
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        category_id: Number(scheduleForm.category_id),
        location_id: scheduleForm.location_id ? Number(scheduleForm.location_id) : null,
        description: scheduleForm.description,
        created_by: currentUserId
      });
      resetScheduleForm();
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errorSaveSchedule");
      setPageMessage(message);
    }
  };

  const handleEditSchedule = (item: ScheduleItem) => {
    setScheduleForm({
      id: item.id,
      schedule_date: item.schedule_date,
      start_time: item.start_time ?? "",
      end_time: item.end_time ?? "",
      category_id: String(item.category_id),
      location_id: item.location_id ? String(item.location_id) : "",
      description: item.description ?? ""
    });
    setSelectedScheduleMonth(item.schedule_date.slice(0, 7));
    setIsScheduleFormOpen(true);
    setActiveTab("schedule");
  };

  const handleDeleteSchedule = async (id: number) => {
    setPageMessage("");
    try {
      await deleteSchedule(id);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errorDeleteSchedule");
      setPageMessage(message);
    }
  };

  const formatMonthLabel = (month: string) => {
    const monthDate = new Date(`${month}-01T00:00:00`);
    return new Intl.DateTimeFormat(i18n.language === "ja" ? "ja-JP" : "en-US", {
      month: i18n.language === "ja" ? "numeric" : "long"
    }).format(monthDate);
  };

  const formatDateTimeDistance = (date: Date) => {
    const diffMs = date.getTime() - currentTime.getTime();
    const isPast = diffMs < 0;
    const totalMinutes = Math.abs(Math.round(diffMs / (1000 * 60)));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    return t("timeUntilSchedule", {
      prefix: isPast ? t("timeAgoPrefix") : t("timeLeftPrefix"),
      days,
      hours,
      minutes
    });
  };

  const formatClock = (date: Date) => {
    return new Intl.DateTimeFormat(i18n.language === "ja" ? "ja-JP" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(date);
  };

  const formatTimeRange = (item: ScheduleItem) => {
    if (item.start_time && item.end_time) {
      return `${item.start_time} - ${item.end_time}`;
    }
    if (item.start_time) {
      return item.start_time;
    }
    return "--:--";
  };

  const getCategoryLabel = (categoryId: number) => {
    return categoryById[categoryId]?.category_name ?? t("unassigned");
  };

  const getCategoryCode = (categoryId: number) => {
    return categoryById[categoryId]?.category_code ?? "practice";
  };

  const handleAttendanceChange = async (
    scheduleId: number,
    attendanceDate: string,
    userId: string,
    status: "present" | "absent" | "late"
  ) => {
    setPageMessage("");
    setSavingAttendanceKey(`${scheduleId}:${userId}`);
    try {
      await upsertAttendance({
        schedule_id: scheduleId,
        user_id: userId,
        attendance_date: attendanceDate,
        status,
        note: ""
      });
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errorSaveAttendance");
      setPageMessage(message);
    } finally {
      setSavingAttendanceKey("");
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">FC</div>
          <div>
            <p className="brand-name">Brothers FC</p>
            <p className="brand-sub">{t("brandSub")}</p>
          </div>
        </div>
        <nav className="menu">
          <button className={`menu-item ${activeTab === "dashboard" ? "menu-item-active" : ""}`} onClick={() => setActiveTab("dashboard")}>
            {t("dashboard")}
          </button>
          <button className={`menu-item ${activeTab === "schedule" ? "menu-item-active" : ""}`} onClick={() => setActiveTab("schedule")}>
            {t("schedule")}
          </button>
          <button className={`menu-item ${activeTab === "attendance" ? "menu-item-active" : ""}`} onClick={() => setActiveTab("attendance")}>
            {t("attendance")}
          </button>
        </nav>
        <div className="profile">
          <div className="avatar">{adminName.slice(0, 1).toUpperCase()}</div>
          <span>{adminName}</span>
          <Link to="/settings" className="button button-secondary button-topbar">
            {t("settings")}
          </Link>
          <button className="button button-secondary button-topbar button-logout-top" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? t("loggingOut") : t("logout")}
          </button>
        </div>
      </header>

      <section className="content-card">
        {loading ? <p>{t("loading")}</p> : null}
        {pageMessage ? <p className="message-error">{pageMessage}</p> : null}

        {!loading && activeTab === "dashboard" ? (
          <section className="section">
            <div className="scoreboard">
              <div className="scoreboard-panel">
                <span className="scoreboard-label">{t("realtimeClock")}</span>
                <strong className="scoreboard-time">{formatClock(currentTime)}</strong>
                <span className="scoreboard-date">{currentTime.toLocaleDateString(i18n.language === "ja" ? "ja-JP" : "en-US")}</span>
              </div>
              <div className="scoreboard-panel scoreboard-panel-highlight">
                <span className="scoreboard-label">{t("nextKickoff")}</span>
                <strong className="scoreboard-time">
                  {nextPracticeOrMatchDateTime ? formatDateTimeDistance(nextPracticeOrMatchDateTime) : "--"}
                </strong>
                <span className="scoreboard-date">
                  {nextPracticeOrMatch ? getCategoryLabel(nextPracticeOrMatch.category_id) : t("noUpcomingSchedule")}
                </span>
              </div>
            </div>

            <h2 className="section-title">{t("nextScheduleSection")}</h2>
            {nextPracticeOrMatch && nextPracticeOrMatchDateTime ? (
              <div className={`summary-card summary-card-${getCategoryCode(nextPracticeOrMatch.category_id)}`}>
                <div className="summary-header">
                  <div>
                    <span className={`category-pill category-pill-${getCategoryCode(nextPracticeOrMatch.category_id)}`}>
                      {getCategoryLabel(nextPracticeOrMatch.category_id)}
                    </span>
                    <p className="summary-title">{t("nextScheduleHeadline", { category: getCategoryLabel(nextPracticeOrMatch.category_id) })}</p>
                  </div>
                  <div className="countdown-ring">
                    <span>{formatClock(currentTime)}</span>
                  </div>
                </div>
                <p className="summary-meta">
                  {nextPracticeOrMatch.schedule_date} / {formatTimeRange(nextPracticeOrMatch)}
                </p>
                <p className="summary-meta">{formatDateTimeDistance(nextPracticeOrMatchDateTime)}</p>
                <p className="summary-meta">
                  {nextPracticeOrMatch.location_id ? locationNameById[nextPracticeOrMatch.location_id] : t("noLocation")}
                </p>
                <div className="participant-block">
                  <p className="participant-title">
                    {t("participantsCountLabel", { count: nextPracticeOrMatchParticipants.length })}
                  </p>
                  {nextPracticeOrMatchParticipants.length > 0 ? (
                    <ul className="name-list">
                      {nextPracticeOrMatchParticipants.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="subtitle">{t("noParticipants")}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="subtitle">{t("noUpcomingSchedule")}</p>
            )}

            <div className="section-header section-header-spaced">
              <h2 className="section-title">{t("nextEventSection")}</h2>
            </div>
            {nextEvent && nextEventDateTime ? (
              <div className="summary-card summary-card-event">
                <div className="summary-header">
                  <div>
                    <span className="category-pill category-pill-event">{getCategoryLabel(nextEvent.category_id)}</span>
                    <p className="summary-title">{t("nextEventHeadline")}</p>
                  </div>
                  <div className="countdown-ring countdown-ring-event">
                    <span>{formatClock(currentTime)}</span>
                  </div>
                </div>
                <p className="summary-meta">
                  {nextEvent.schedule_date} / {formatTimeRange(nextEvent)}
                </p>
                <p className="summary-meta">{formatDateTimeDistance(nextEventDateTime)}</p>
                <p className="summary-meta">
                  {nextEvent.location_id ? locationNameById[nextEvent.location_id] : t("noLocation")}
                </p>
                <p className="summary-meta">{nextEvent.description || "-"}</p>
                <div className="participant-block">
                  <p className="participant-title">
                    {t("participantsCountLabel", { count: nextEventParticipants.length })}
                  </p>
                  {nextEventParticipants.length > 0 ? (
                    <ul className="name-list">
                      {nextEventParticipants.map((name) => (
                        <li key={`event-${name}`}>{name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="subtitle">{t("noParticipants")}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="subtitle">{t("noUpcomingEvent")}</p>
            )}

            <div className="section-header section-header-spaced">
              <h2 className="section-title">{t("monthlyPlayerAttendanceRate")}</h2>
              {scheduleMonths.length > 0 ? (
                <div className="month-switcher" role="tablist" aria-label={t("monthlyPlayerAttendanceRate")}>
                  {scheduleMonths.map((month) => (
                    <button
                      key={month}
                      className={`month-chip ${selectedDashboardMonth === month ? "month-chip-active" : ""}`}
                      type="button"
                      onClick={() => setSelectedDashboardMonth(month)}
                    >
                      {formatMonthLabel(month)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {dashboardAttendanceRates.length > 0 ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("player")}</th>
                      <th>{t("attendanceRate")}</th>
                      <th>{t("attendanceCount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardAttendanceRates.map(({ player, rate, attended, total }) => (
                      <tr key={player.id}>
                        <td>{player.full_name}</td>
                        <td>{rate}%</td>
                        <td>{t("attendanceCountValue", { attended, total })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="subtitle">{t("noSchedules")}</p>
            )}
          </section>
        ) : null}

        {!loading && activeTab === "schedule" ? (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">{t("scheduleMaintenance")}</h2>
              <div className="inline-actions">
                <button
                  className="button button-secondary button-compact"
                  type="button"
                  onClick={() => {
                    setScheduleForm(EMPTY_FORM);
                    setIsScheduleFormOpen((prev) => !prev);
                  }}
                >
                  {isScheduleFormOpen ? t("hideScheduleForm") : t("showScheduleForm")}
                </button>
              </div>
            </div>

            {isScheduleFormOpen ? (
              <form className="form form-compact" onSubmit={handleScheduleSubmit}>
                <div className="form-grid">
                  <label className="label">
                    {t("date")}
                    <input
                      className="input input-compact"
                      type="date"
                      value={scheduleForm.schedule_date}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, schedule_date: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="label">
                    {t("category")}
                    <select
                      className="input input-compact"
                      value={scheduleForm.category_id}
                      onChange={(event) => setScheduleForm((prev) => ({ ...prev, category_id: event.target.value }))}
                      required
                    >
                      <option value="">{t("selectCategory")}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.category_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="label">
                    {t("startTime")}
                    <input
                      className="input input-compact"
                      type="time"
                      value={scheduleForm.start_time}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, start_time: event.target.value }))
                      }
                    />
                  </label>
                  <label className="label">
                    {t("endTime")}
                    <input
                      className="input input-compact"
                      type="time"
                      value={scheduleForm.end_time}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, end_time: event.target.value }))
                      }
                    />
                  </label>
                  <label className="label">
                    {t("location")}
                    <select
                      className="input input-compact"
                      value={scheduleForm.location_id}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, location_id: event.target.value }))
                      }
                    >
                      <option value="">{t("unassigned")}</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.facility_name}
                          {!location.is_active ? ` ${t("inactive")}` : ""}
                        </option>
                      ))}
                    </select>
                    {locations.length === 0 ? (
                      <span className="helper-text">{t("noLocationRecords")}</span>
                    ) : null}
                  </label>
                  <label className="label label-wide">
                    {t("description")}
                    <textarea
                      className="input input-compact textarea-compact"
                      value={scheduleForm.description}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="inline-actions">
                  <button className="button button-compact" type="submit">
                    {scheduleForm.id ? t("updateSchedule") : t("createSchedule")}
                  </button>
                  <button
                    className="button button-secondary button-compact"
                    type="button"
                    onClick={resetScheduleForm}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            ) : null}

            <div className="section-header section-header-spaced">
              <h3 className="section-title">{monthlyScheduleTitle}</h3>
              {scheduleMonths.length > 0 ? (
                <div className="month-switcher" role="tablist" aria-label={t("monthlyView")}>
                  {scheduleMonths.map((month) => {
                    const monthDate = new Date(`${month}-01T00:00:00`);
                    const label = new Intl.DateTimeFormat(i18n.language === "ja" ? "ja-JP" : "en-US", {
                      month: i18n.language === "ja" ? "numeric" : "long"
                    }).format(monthDate);
                    return (
                      <button
                        key={month}
                        className={`month-chip ${selectedScheduleMonth === month ? "month-chip-active" : ""}`}
                        type="button"
                        onClick={() => setSelectedScheduleMonth(month)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {monthlySchedules.length > 0 ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("date")}</th>
                      <th>{t("time")}</th>
                      <th>{t("location")}</th>
                      <th>{t("notes")}</th>
                      <th>{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySchedules.map((item) => (
                      <tr key={item.id}>
                        <td>{item.schedule_date}</td>
                        <td>
                          {item.start_time ?? "--:--"}
                          {item.end_time ? ` - ${item.end_time}` : ""}
                        </td>
                        <td>{item.location_id ? locationNameById[item.location_id] : t("noLocation")}</td>
                        <td>
                          <span className={`category-pill category-pill-${getCategoryCode(item.category_id)}`}>
                            {getCategoryLabel(item.category_id)}
                          </span>
                          <span className="notes-text">{item.description || "-"}</span>
                        </td>
                        <td>
                          <div className="inline-actions">
                            <button
                              className="button button-secondary button-compact"
                              type="button"
                              onClick={() => handleEditSchedule(item)}
                            >
                              {t("edit")}
                            </button>
                            <button
                              className="button button-secondary button-compact"
                              type="button"
                              onClick={() => void handleDeleteSchedule(item.id)}
                            >
                              {t("delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="subtitle">{t("noSchedules")}</p>
            )}
          </section>
        ) : null}

        {!loading && activeTab === "attendance" ? (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">{t("monthlyAttendanceManagement")}</h2>
              {scheduleMonths.length > 0 ? (
                <div className="month-switcher" role="tablist" aria-label={t("monthlyAttendanceManagement")}>
                  {scheduleMonths.map((month) => (
                    <button
                      key={month}
                      className={`month-chip ${selectedAttendanceMonth === month ? "month-chip-active" : ""}`}
                      type="button"
                      onClick={() => setSelectedAttendanceMonth(month)}
                    >
                      {formatMonthLabel(month)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {attendanceScheduleCards.length > 0 ? (
              <div className="attendance-day-list">
                {attendanceScheduleCards.map(({ schedule, rows, participants }) => (
                  <article className="attendance-day-card" key={schedule.id}>
                    <div className="attendance-day-header">
                      <div>
                        <h3 className="attendance-day-title">{schedule.schedule_date}</h3>
                        <p className="summary-meta">
                          {getCategoryLabel(schedule.category_id)} / {formatTimeRange(schedule)}
                        </p>
                        <p className="summary-meta">
                          {schedule.location_id ? locationNameById[schedule.location_id] : t("noLocation")}
                        </p>
                      </div>
                      <div className="attendance-count-box">
                        <span>{t("participantsTotal")}</span>
                        <strong>{participants.length}</strong>
                      </div>
                    </div>

                    <div className="participant-block">
                      <p className="participant-title">{t("participantsList")}</p>
                      {participants.length > 0 ? (
                        <ul className="name-list">
                          {participants.map((name) => (
                            <li key={`${schedule.id}-${name}`}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="subtitle">{t("noParticipants")}</p>
                      )}
                    </div>

                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>{t("player")}</th>
                            <th>{t("status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={`${schedule.id}-${row.player.id}`}>
                              <td>{row.player.full_name}</td>
                              <td>
                                <select
                                  className="input input-compact"
                                  value={row.status}
                                  disabled={savingAttendanceKey === `${schedule.id}:${row.player.id}`}
                                  onChange={(event) =>
                                    void handleAttendanceChange(
                                      schedule.id,
                                      schedule.schedule_date,
                                      row.player.id,
                                      event.target.value as "present" | "absent" | "late"
                                    )
                                  }
                                >
                                  <option value="present">{t("present")}</option>
                                  <option value="late">{t("late")}</option>
                                  <option value="absent">{t("absent")}</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="subtitle">{t("noSchedules")}</p>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}
