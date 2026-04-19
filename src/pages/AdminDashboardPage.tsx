import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaArrowRightFromBracket,
  FaCalendarDays,
  FaClipboardCheck,
  FaGear,
  FaHouse
} from "react-icons/fa6";
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
import { ClubLogo } from "../components/ClubLogo";

type AdminTab = "dashboard" | "schedule" | "attendance";
type AttendanceStatus = "present" | "absent" | "late";
type LocationType = "stadium" | "event";

interface ScheduleForm {
  id?: number;
  schedule_date: string;
  start_time: string;
  end_time: string;
  vote_deadline: string;
  category_id: string;
  location_type: LocationType | "";
  location_id: string;
  description: string;
}

const EMPTY_FORM: ScheduleForm = {
  schedule_date: "",
  start_time: "",
  end_time: "",
  vote_deadline: "",
  category_id: "",
  location_type: "",
  location_id: "",
  description: ""
};

function toDateTimeInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}

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

  const players = useMemo(
    () => users.filter((user) => user.role === "player" && user.is_active_player),
    [users]
  );

  const locationById = useMemo(() => {
    return locations.reduce<Record<number, LocationMaster>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [locations]);

  const categoryById = useMemo(() => {
    return categories.reduce<Record<number, CategoryMaster>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [categories]);

  const filteredLocations = useMemo(() => {
    if (!scheduleForm.location_type) {
      return [];
    }
    return locations.filter((location) => location.location_type === scheduleForm.location_type);
  }, [locations, scheduleForm.location_type]);

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
      setSelectedScheduleMonth("");
      setSelectedAttendanceMonth("");
      setSelectedDashboardMonth("");
      return;
    }
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!selectedScheduleMonth || !scheduleMonths.includes(selectedScheduleMonth)) {
      setSelectedScheduleMonth(scheduleMonths.includes(currentMonth) ? currentMonth : scheduleMonths[0]);
    }
    if (!selectedAttendanceMonth || !scheduleMonths.includes(selectedAttendanceMonth)) {
      setSelectedAttendanceMonth(scheduleMonths.includes(currentMonth) ? currentMonth : scheduleMonths[0]);
    }
    if (!selectedDashboardMonth || !scheduleMonths.includes(selectedDashboardMonth)) {
      setSelectedDashboardMonth(scheduleMonths.includes(currentMonth) ? currentMonth : scheduleMonths[0]);
    }
  }, [scheduleMonths, selectedAttendanceMonth, selectedDashboardMonth, selectedScheduleMonth]);

  useEffect(() => {
    if (
      scheduleForm.location_id &&
      filteredLocations.every((location) => String(location.id) !== scheduleForm.location_id)
    ) {
      setScheduleForm((prev) => ({ ...prev, location_id: "" }));
    }
  }, [filteredLocations, scheduleForm.location_id]);

  const monthlySchedules = selectedScheduleMonth ? schedulesByMonth[selectedScheduleMonth] ?? [] : [];
  const monthlyAttendanceSchedules = selectedAttendanceMonth ? schedulesByMonth[selectedAttendanceMonth] ?? [] : [];

  const nextPracticeOrMatch = useMemo(() => {
    const now = Date.now();
    return (
      schedules.find((item) => {
        const categoryCode = categoryById[item.category_id]?.category_code;
        if (categoryCode !== "practice" && categoryCode !== "match") {
          return false;
        }
        return new Date(`${item.schedule_date}T${item.start_time ?? "00:00"}`).getTime() >= now;
      }) ?? null
    );
  }, [categoryById, schedules]);

  const nextEvent = useMemo(() => {
    const now = Date.now();
    return (
      schedules.find((item) => {
        if (categoryById[item.category_id]?.category_code !== "event") {
          return false;
        }
        return new Date(`${item.schedule_date}T${item.start_time ?? "00:00"}`).getTime() >= now;
      }) ?? null
    );
  }, [categoryById, schedules]);

  const getParticipants = (scheduleId: number) =>
    attendance
      .filter((item) => item.schedule_id === scheduleId && (item.status === "present" || item.status === "late"))
      .map((item) => playerNameById[item.user_id])
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b, i18n.language === "ja" ? "ja" : "en"));

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
      return { player, attended, total, rate };
    });
  }, [attendance, players, schedulesByMonth, selectedDashboardMonth]);

  const attendanceScheduleCards = useMemo(() => {
    return monthlyAttendanceSchedules.map((schedule) => {
      const rows = players.map((player) => {
        const record = attendanceByScheduleAndUser[`${schedule.id}:${player.id}`];
        return {
          player,
          status: (record?.status ?? "absent") as AttendanceStatus
        };
      });
      return {
        schedule,
        rows,
        participants: rows
          .filter((row) => row.status === "present" || row.status === "late")
          .map((row) => row.player.full_name)
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
    if (!scheduleForm.location_type || !scheduleForm.location_id) {
      setPageMessage(t("errorLocationTypeRequired"));
      return;
    }

    try {
      await upsertSchedule({
        id: scheduleForm.id,
        schedule_date: scheduleForm.schedule_date,
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        vote_deadline: toIsoFromDateTimeInput(scheduleForm.vote_deadline),
        category_id: Number(scheduleForm.category_id),
        location_id: Number(scheduleForm.location_id),
        description: scheduleForm.description,
        created_by: currentUserId
      });
      resetScheduleForm();
      await loadData();
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : t("errorSaveSchedule"));
    }
  };

  const handleEditSchedule = (item: ScheduleItem) => {
    const location = locationById[item.location_id];
    setScheduleForm({
      id: item.id,
      schedule_date: item.schedule_date,
      start_time: item.start_time ?? "",
      end_time: item.end_time ?? "",
      vote_deadline: toDateTimeInputValue(item.vote_deadline),
      category_id: String(item.category_id),
      location_type: location?.location_type ?? "",
      location_id: String(item.location_id),
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
      setPageMessage(error instanceof Error ? error.message : t("errorDeleteSchedule"));
    }
  };

  const handleAttendanceChange = async (
    scheduleId: number,
    attendanceDate: string,
    userId: string,
    status: AttendanceStatus
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
      setPageMessage(error instanceof Error ? error.message : t("errorSaveAttendance"));
    } finally {
      setSavingAttendanceKey("");
    }
  };

  const formatMonthLabel = (month: string) => {
    const monthDate = new Date(`${month}-01T00:00:00`);
    return new Intl.DateTimeFormat(i18n.language === "ja" ? "ja-JP" : "en-US", {
      month: i18n.language === "ja" ? "numeric" : "long"
    }).format(monthDate);
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

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(i18n.language === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));

  const getCategoryLabel = (categoryId: number) => {
    return categoryById[categoryId]?.category_name ?? t("unassigned");
  };

  const getCategoryCode = (categoryId: number) => {
    return categoryById[categoryId]?.category_code ?? "practice";
  };

  const getLocationTypeLabel = (locationType: LocationType) => {
    return locationType === "stadium" ? t("stadium") : t("eventLocation");
  };

  const renderNavButton = (tab: AdminTab, label: string, icon: ReactNode) => (
    <button
      className={`player-nav-item ${activeTab === tab ? "player-nav-item-active" : ""}`}
      type="button"
      onClick={() => setActiveTab(tab)}
    >
      <span className="player-nav-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="player-nav-label">{label}</span>
    </button>
  );

  return (
    <main className="player-app-shell admin-app-shell">
      <header className="player-header admin-header">
        <ClubLogo className="player-logo-badge" />
        <div className="player-header-center admin-header-center">
          <p className="brand-name">Brothers FC</p>
          <p className="brand-sub">{t("brandSub")}</p>
        </div>
        <div className="admin-header-actions">
          <Link to="/settings" className="button button-secondary button-topbar admin-header-button">
            <FaGear />
            <span>{t("settings")}</span>
          </Link>
          <button
            className="button button-secondary button-topbar button-logout-top admin-header-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <FaArrowRightFromBracket />
            <span>{isLoggingOut ? t("loggingOut") : t("logout")}</span>
          </button>
        </div>
      </header>

      <nav className="player-bottom-nav player-bottom-nav-desktop" aria-label="Admin navigation">
        {renderNavButton("dashboard", t("home"), <FaHouse />)}
        {renderNavButton("schedule", t("schedule"), <FaCalendarDays />)}
        {renderNavButton("attendance", t("attendance"), <FaClipboardCheck />)}
      </nav>

      <section className="player-content-card content-card admin-content-card">
        {loading ? <p>{t("loading")}</p> : null}
        {pageMessage ? <p className="message-error">{pageMessage}</p> : null}

        {!loading && activeTab === "dashboard" ? (
          <section className="section">
            <h2 className="section-title">{t("nextScheduleSection")}</h2>
            {nextPracticeOrMatch ? (
              <article className={`summary-card summary-card-${getCategoryCode(nextPracticeOrMatch.category_id)}`}>
                <span className={`category-pill category-pill-${getCategoryCode(nextPracticeOrMatch.category_id)}`}>
                  {getCategoryLabel(nextPracticeOrMatch.category_id)}
                </span>
                <p className="summary-title">{t("nextScheduleHeadline", { category: getCategoryLabel(nextPracticeOrMatch.category_id) })}</p>
                <p className="summary-meta">
                  {nextPracticeOrMatch.schedule_date} / {formatTimeRange(nextPracticeOrMatch)}
                </p>
                <p className="summary-meta">
                  {locationById[nextPracticeOrMatch.location_id]?.facility_name ?? t("noLocation")}
                </p>
                <p className="summary-meta">
                  {t("voteDeadline")}: {formatDateTime(nextPracticeOrMatch.vote_deadline)}
                </p>
                <div className="participant-block">
                  <p className="participant-title">
                    {t("participantsCountLabel", { count: getParticipants(nextPracticeOrMatch.id).length })}
                  </p>
                  {getParticipants(nextPracticeOrMatch.id).length > 0 ? (
                    <ul className="name-list">
                      {getParticipants(nextPracticeOrMatch.id).map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="subtitle">{t("noParticipants")}</p>
                  )}
                </div>
              </article>
            ) : (
              <p className="subtitle">{t("noUpcomingSchedule")}</p>
            )}

            <div className="section-header section-header-spaced">
              <h2 className="section-title">{t("nextEventSection")}</h2>
            </div>
            {nextEvent ? (
              <article className="summary-card summary-card-event">
                <span className="category-pill category-pill-event">{getCategoryLabel(nextEvent.category_id)}</span>
                <p className="summary-title">{t("nextEventHeadline")}</p>
                <p className="summary-meta">
                  {nextEvent.schedule_date} / {formatTimeRange(nextEvent)}
                </p>
                <p className="summary-meta">{locationById[nextEvent.location_id]?.facility_name ?? t("noLocation")}</p>
                <p className="summary-meta">
                  {t("voteDeadline")}: {formatDateTime(nextEvent.vote_deadline)}
                </p>
                <p className="summary-meta">{nextEvent.description || "-"}</p>
              </article>
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
                    if (isScheduleFormOpen) {
                      resetScheduleForm();
                    } else {
                      setScheduleForm(EMPTY_FORM);
                      setIsScheduleFormOpen(true);
                    }
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
                    {t("voteDeadline")}
                    <input
                      className="input input-compact"
                      type="datetime-local"
                      value={scheduleForm.vote_deadline}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, vote_deadline: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="label">
                    {t("locationType")}
                    <select
                      className="input input-compact"
                      value={scheduleForm.location_type}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          location_type: event.target.value as LocationType | "",
                          location_id: ""
                        }))
                      }
                      required
                    >
                      <option value="">{t("selectLocationType")}</option>
                      <option value="stadium">{t("stadium")}</option>
                      <option value="event">{t("eventLocation")}</option>
                    </select>
                  </label>
                  <label className="label">
                    {t("location")}
                    <select
                      className="input input-compact"
                      value={scheduleForm.location_id}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, location_id: event.target.value }))
                      }
                      required
                    >
                      <option value="">{t("selectLocation")}</option>
                      {filteredLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.facility_name}
                          {!location.is_active ? ` ${t("inactive")}` : ""}
                        </option>
                      ))}
                    </select>
                    {filteredLocations.length === 0 ? (
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
              <h3 className="section-title">{t("monthlyView")}</h3>
              {scheduleMonths.length > 0 ? (
                <div className="month-switcher" role="tablist" aria-label={t("monthlyView")}>
                  {scheduleMonths.map((month) => (
                    <button
                      key={month}
                      className={`month-chip ${selectedScheduleMonth === month ? "month-chip-active" : ""}`}
                      type="button"
                      onClick={() => setSelectedScheduleMonth(month)}
                    >
                      {formatMonthLabel(month)}
                    </button>
                  ))}
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
                      <th>{t("voteDeadline")}</th>
                      <th>{t("location")}</th>
                      <th>{t("notes")}</th>
                      <th>{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySchedules.map((item) => {
                      const location = locationById[item.location_id];
                      return (
                        <tr key={item.id}>
                          <td>{item.schedule_date}</td>
                          <td>{formatTimeRange(item)}</td>
                          <td>{formatDateTime(item.vote_deadline)}</td>
                          <td>
                            <span className="location-type-chip">
                              {location ? getLocationTypeLabel(location.location_type) : t("unassigned")}
                            </span>
                            <span className="notes-text">{location?.facility_name ?? t("noLocation")}</span>
                          </td>
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
                      );
                    })}
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
                {attendanceScheduleCards.map(({ schedule, rows, participants }) => {
                  const location = locationById[schedule.location_id];
                  return (
                    <article className="attendance-day-card" key={schedule.id}>
                      <div className="attendance-day-header">
                        <div>
                          <h3 className="attendance-day-title">{schedule.schedule_date}</h3>
                          <p className="summary-meta">
                            {getCategoryLabel(schedule.category_id)} / {formatTimeRange(schedule)}
                          </p>
                          <p className="summary-meta">
                            {location?.facility_name ?? t("noLocation")}
                            {location ? ` (${getLocationTypeLabel(location.location_type)})` : ""}
                          </p>
                          <p className="summary-meta">
                            {t("voteDeadline")}: {formatDateTime(schedule.vote_deadline)}
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
                                        event.target.value as AttendanceStatus
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
                  );
                })}
              </div>
            ) : (
              <p className="subtitle">{t("noSchedules")}</p>
            )}
          </section>
        ) : null}
      </section>

      <nav className="player-bottom-nav player-bottom-nav-mobile" aria-label="Admin navigation">
        {renderNavButton("dashboard", t("home"), <FaHouse />)}
        {renderNavButton("schedule", t("schedule"), <FaCalendarDays />)}
        {renderNavButton("attendance", t("attendance"), <FaClipboardCheck />)}
      </nav>
    </main>
  );
}
