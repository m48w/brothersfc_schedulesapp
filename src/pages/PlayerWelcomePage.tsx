import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AppUser,
  AttendanceItem,
  CategoryMaster,
  LocationMaster,
  ScheduleItem,
  fetchAttendance,
  fetchCategories,
  fetchLocations,
  fetchSchedules,
  fetchUsers,
  upsertAttendance
} from "../features/admin/api";
import {
  getCurrentUserProfile,
  logout,
  updatePasswordWithCurrentPassword
} from "../features/auth/api";
import { fetchPlayerProfile, PlayerProfileDetail, upsertPlayerProfile } from "../features/player/api";

type PlayerTab = "dashboard" | "schedule" | "profile" | "settings";
type AttendanceStatus = "present" | "absent" | "late";

interface PlayerLocationState {
  playerName?: string;
}

interface PlayerProfileForm {
  photo_url: string;
  jersey_name: string;
  back_number: string;
  jersey_size: string;
  birth_date: string;
  nationality: string;
  position: string;
  current_status: boolean;
  remark: string;
}

const EMPTY_PLAYER_PROFILE_FORM: PlayerProfileForm = {
  photo_url: "",
  jersey_name: "",
  back_number: "",
  jersey_size: "",
  birth_date: "",
  nationality: "",
  position: "",
  current_status: true,
  remark: ""
};

const ATTENDANCE_OPEN_STATUSES: AttendanceStatus[] = ["present", "absent"];

export function PlayerWelcomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PlayerLocationState | null;
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<PlayerTab>("dashboard");
  const [playerName, setPlayerName] = useState(state?.playerName ?? "");
  const [playerUserId, setPlayerUserId] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState("");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [profileForm, setProfileForm] = useState<PlayerProfileForm>(EMPTY_PLAYER_PROFILE_FORM);
  const [selectedDashboardMonth, setSelectedDashboardMonth] = useState("");
  const [selectedScheduleMonth, setSelectedScheduleMonth] = useState("");
  const [savingAttendanceScheduleId, setSavingAttendanceScheduleId] = useState<number | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadPortalData = async (userId: string) => {
    setLoading(true);
    setPageMessage("");
    const [usersResult, locationsResult, categoriesResult, schedulesResult, attendanceResult, playerProfileResult] =
      await Promise.allSettled([
        fetchUsers(),
        fetchLocations(),
        fetchCategories(),
        fetchSchedules(),
        fetchAttendance(),
        fetchPlayerProfile(userId)
      ]);

    const errors: string[] = [];

    if (usersResult.status === "fulfilled") setUsers(usersResult.value);
    else errors.push(usersResult.reason instanceof Error ? usersResult.reason.message : t("errorLoadUsers"));

    if (locationsResult.status === "fulfilled") setLocations(locationsResult.value);
    else {
      errors.push(
        locationsResult.reason instanceof Error ? locationsResult.reason.message : t("errorLoadLocations")
      );
    }

    if (categoriesResult.status === "fulfilled") setCategories(categoriesResult.value);
    else {
      errors.push(
        categoriesResult.reason instanceof Error
          ? categoriesResult.reason.message
          : t("errorLoadCategories")
      );
    }

    if (schedulesResult.status === "fulfilled") setSchedules(schedulesResult.value);
    else {
      errors.push(
        schedulesResult.reason instanceof Error ? schedulesResult.reason.message : t("errorLoadSchedules")
      );
    }

    if (attendanceResult.status === "fulfilled") setAttendance(attendanceResult.value);
    else {
      errors.push(
        attendanceResult.reason instanceof Error ? attendanceResult.reason.message : t("errorLoadAttendance")
      );
    }

    if (playerProfileResult.status === "fulfilled") {
      const profile = playerProfileResult.value;
      setProfileForm({
        photo_url: profile?.photo_url ?? "",
        jersey_name: profile?.jersey_name ?? "",
        back_number: profile?.back_number ? String(profile.back_number) : "",
        jersey_size: profile?.jersey_size ?? "",
        birth_date: profile?.birth_date ?? "",
        nationality: profile?.nationality ?? "",
        position: profile?.position ?? "",
        current_status: profile?.current_status ?? true,
        remark: profile?.remark ?? ""
      });
    } else {
      errors.push(
        playerProfileResult.reason instanceof Error
          ? playerProfileResult.reason.message
          : t("errorLoadPlayerProfile")
      );
    }

    if (errors.length > 0) setPageMessage(errors.join(" | "));
    setLoading(false);
  };

  useEffect(() => {
    const resolveProfile = async () => {
      try {
        const profile = await getCurrentUserProfile();
        if (!profile || profile.role !== "player") {
          navigate("/", { replace: true });
          return;
        }
        setPlayerName(profile.full_name);
        setPlayerUserId(profile.id);
        await loadPortalData(profile.id);
      } catch {
        navigate("/", { replace: true });
      } finally {
        setIsLoadingProfile(false);
      }
    };
    void resolveProfile();
  }, [navigate]);

  const playerRoster = useMemo(
    () => users.filter((user) => user.role === "player" && user.is_active_player),
    [users]
  );

  const locationById = useMemo(
    () =>
      locations.reduce<Record<number, LocationMaster>>((acc, location) => {
        acc[location.id] = location;
        return acc;
      }, {}),
    [locations]
  );

  const categoryById = useMemo(
    () =>
      categories.reduce<Record<number, CategoryMaster>>((acc, category) => {
        acc[category.id] = category;
        return acc;
      }, {}),
    [categories]
  );

  const playerNameById = useMemo(
    () =>
      playerRoster.reduce<Record<string, string>>((acc, player) => {
        acc[player.id] = player.full_name;
        return acc;
      }, {}),
    [playerRoster]
  );

  const attendanceByScheduleAndUser = useMemo(
    () =>
      attendance.reduce<Record<string, AttendanceItem>>((acc, item) => {
        acc[`${item.schedule_id}:${item.user_id}`] = item;
        return acc;
      }, {}),
    [attendance]
  );

  const scheduleMonths = useMemo(
    () => Array.from(new Set(schedules.map((item) => item.schedule_date.slice(0, 7)))).sort(),
    [schedules]
  );

  const schedulesByMonth = useMemo(
    () =>
      schedules.reduce<Record<string, ScheduleItem[]>>((acc, schedule) => {
        const month = schedule.schedule_date.slice(0, 7);
        if (!acc[month]) acc[month] = [];
        acc[month].push(schedule);
        return acc;
      }, {}),
    [schedules]
  );

  useEffect(() => {
    if (scheduleMonths.length === 0) return;
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (!selectedDashboardMonth || !scheduleMonths.includes(selectedDashboardMonth)) {
      setSelectedDashboardMonth(scheduleMonths.includes(currentMonth) ? currentMonth : scheduleMonths[0]);
    }
    if (!selectedScheduleMonth || !scheduleMonths.includes(selectedScheduleMonth)) {
      setSelectedScheduleMonth(scheduleMonths.includes(currentMonth) ? currentMonth : scheduleMonths[0]);
    }
  }, [scheduleMonths, selectedDashboardMonth, selectedScheduleMonth]);

  const nextEvent = useMemo(
    () =>
      schedules.find((schedule) => {
        if (categoryById[schedule.category_id]?.category_code !== "event") return false;
        return (
          new Date(`${schedule.schedule_date}T${schedule.start_time ?? "00:00"}`).getTime() >=
          currentTime.getTime()
        );
      }) ?? null,
    [categoryById, currentTime, schedules]
  );

  const nextPracticeOrMatch = useMemo(
    () =>
      schedules.find((schedule) => {
        const code = categoryById[schedule.category_id]?.category_code;
        if (code !== "practice" && code !== "match") return false;
        return (
          new Date(`${schedule.schedule_date}T${schedule.start_time ?? "00:00"}`).getTime() >=
          currentTime.getTime()
        );
      }) ?? null,
    [categoryById, currentTime, schedules]
  );

  const monthlyDashboardSchedules = selectedDashboardMonth ? schedulesByMonth[selectedDashboardMonth] ?? [] : [];
  const monthlyScheduleList = selectedScheduleMonth ? schedulesByMonth[selectedScheduleMonth] ?? [] : [];

  const getParticipants = (scheduleId: number) =>
    attendance
      .filter((item) => item.schedule_id === scheduleId && (item.status === "present" || item.status === "late"))
      .map((item) => playerNameById[item.user_id])
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b, i18n.language === "ja" ? "ja" : "en"));

  const getScheduleDateTime = (schedule: ScheduleItem) =>
    new Date(`${schedule.schedule_date}T${schedule.start_time ?? "00:00"}`);

  const isAttendanceOpen = (schedule: ScheduleItem) => getScheduleDateTime(schedule).getTime() > currentTime.getTime();

  const getAttendanceWindowMessage = (schedule: ScheduleItem) =>
    isAttendanceOpen(schedule)
      ? i18n.language === "ja"
        ? "期限内のため、出欠は更新できます。"
        : "Attendance can be updated until the schedule starts."
      : i18n.language === "ja"
        ? "制限期間を過ぎたため、出欠は変更できません。"
        : "Attendance voting is closed for this schedule.";

  const getCategoryLabel = (categoryId: number) => categoryById[categoryId]?.category_name ?? t("unassigned");
  const getCategoryCode = (categoryId: number) => categoryById[categoryId]?.category_code ?? "practice";

  const formatMonthLabel = (month: string) => {
    const monthDate = new Date(`${month}-01T00:00:00`);
    return new Intl.DateTimeFormat(i18n.language === "ja" ? "ja-JP" : "en-US", {
      month: i18n.language === "ja" ? "numeric" : "long"
    }).format(monthDate);
  };

  const formatCountdown = (date: Date) => {
    const diffMs = Math.max(0, date.getTime() - currentTime.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    return `${days}${t("dayUnit")} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const formatTimeRange = (schedule: ScheduleItem) => {
    if (schedule.start_time && schedule.end_time) return `${schedule.start_time} - ${schedule.end_time}`;
    if (schedule.start_time) return schedule.start_time;
    return "--:--";
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return "-";
    const birth = new Date(`${birthDate}T00:00:00`);
    let age = currentTime.getFullYear() - birth.getFullYear();
    const monthDiff = currentTime.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && currentTime.getDate() < birth.getDate())) age -= 1;
    return `${age}`;
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAttendanceSubmit = async (
    scheduleId: number,
    attendanceDate: string,
    status: AttendanceStatus
  ) => {
    if (!playerUserId) return;
    setSavingAttendanceScheduleId(scheduleId);
    setPageMessage("");
    try {
      await upsertAttendance({
        schedule_id: scheduleId,
        user_id: playerUserId,
        attendance_date: attendanceDate,
        status,
        note: ""
      });
      await loadPortalData(playerUserId);
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : t("errorSaveAttendance"));
    } finally {
      setSavingAttendanceScheduleId(null);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!playerUserId) return;
    setIsSavingProfile(true);
    setPageMessage("");
    try {
      await upsertPlayerProfile({
        user_id: playerUserId,
        photo_url: profileForm.photo_url || null,
        jersey_name: profileForm.jersey_name || null,
        back_number: profileForm.back_number ? Number(profileForm.back_number) : null,
        jersey_size: profileForm.jersey_size || null,
        birth_date: profileForm.birth_date || null,
        nationality: profileForm.nationality || null,
        position: profileForm.position || null,
        current_status: profileForm.current_status,
        remark: profileForm.remark || null
      } as PlayerProfileDetail);
      setPageMessage(t("playerProfileSaved"));
      await loadPortalData(playerUserId);
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : t("errorSavePlayerProfile"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingPassword(true);
    setPageMessage("");
    try {
      await updatePasswordWithCurrentPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setPageMessage(t("passwordUpdated"));
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : t("errorUpdatePassword"));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLanguageChange = (language: string) => {
    localStorage.setItem("i18nextLng", language);
    void i18n.changeLanguage(language);
  };

  if (isLoadingProfile) {
    return (
      <main className="page-shell">
        <section className="card">
          <p>{t("loading")}</p>
        </section>
      </main>
    );
  }

  const renderScheduleCard = (schedule: ScheduleItem, showActions: boolean) => {
    const participants = getParticipants(schedule.id);
    const myAttendance = attendanceByScheduleAndUser[`${schedule.id}:${playerUserId}`];
    const locationMaster = schedule.location_id ? locationById[schedule.location_id] : null;
    const attendanceOpen = isAttendanceOpen(schedule);

    return (
      <article className="player-schedule-card" key={schedule.id}>
        <div className="player-schedule-header">
          <div>
            <span className={`category-pill category-pill-${getCategoryCode(schedule.category_id)}`}>
              {getCategoryLabel(schedule.category_id)}
            </span>
            <h3 className="attendance-day-title">{schedule.schedule_date}</h3>
            <p className="summary-meta">{formatTimeRange(schedule)}</p>
            <p className="summary-meta">{schedule.description || "-"}</p>
            {locationMaster?.map_url ? (
              <a className="map-link" href={locationMaster.map_url ?? "#"} target="_blank" rel="noreferrer">
                {locationMaster.facility_name}
              </a>
            ) : locationMaster ? (
              <p className="summary-meta">{locationMaster.facility_name}</p>
            ) : (
              <p className="summary-meta">{t("noLocation")}</p>
            )}
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

        {showActions ? (
          <div className="attendance-action-row">
            <span className={`attendance-status-chip ${attendanceOpen ? "attendance-status-chip-open" : "attendance-status-chip-closed"}`}>
              {t("yourAttendanceStatus")}: {myAttendance ? t(myAttendance.status) : t("notAnswered")}
            </span>
            <span className={`attendance-window-note ${attendanceOpen ? "attendance-window-note-open" : "attendance-window-note-closed"}`}>
              {getAttendanceWindowMessage(schedule)}
            </span>
            <div className="inline-actions">
              {ATTENDANCE_OPEN_STATUSES.map((status) => (
                <button
                  key={`${schedule.id}-${status}`}
                  className={`button button-compact ${status === "absent" ? "button-secondary" : ""}`}
                  type="button"
                  disabled={!attendanceOpen || savingAttendanceScheduleId === schedule.id}
                  onClick={() => void handleAttendanceSubmit(schedule.id, schedule.schedule_date, status)}
                >
                  {status === "present" ? t("join") : t("absent")}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <main className="player-app-shell">
      <header className="player-header">
        <div className="player-logo-badge">FC</div>
        <div className="player-header-center">
          <p className="brand-name">Brothers FC</p>
          <p className="brand-sub">{playerName}</p>
        </div>
        <button className="button button-secondary button-topbar" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? t("loggingOut") : t("logout")}
        </button>
      </header>

      <nav className="player-bottom-nav player-bottom-nav-desktop" aria-label="Player navigation">
        <button
          className={`player-nav-item ${activeTab === "dashboard" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("dashboard")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 13h7V4H4v9Zm9 7h7v-7h-7v7ZM4 20h7v-5H4v5Zm9-9h7V4h-7v7Z" />
            </svg>
          </span>
          <span className="player-nav-label">{t("dashboard")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "schedule" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("schedule")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Zm0-4H6v2h12V6Z" />
            </svg>
          </span>
          <span className="player-nav-label">{t("schedule")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "profile" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("profile")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4Z" />
            </svg>
          </span>
          <span className="player-nav-label">{t("profile")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "settings" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("settings")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58-1.92-3.32-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54h-3.84l-.36 2.54c-.58.22-1.12.54-1.63.94l-2.39-.96-1.92 3.32 2.03 1.58a7.93 7.93 0 0 0 0 1.88l-2.03 1.58 1.92 3.32 2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54h3.84l.36-2.54c.58-.22 1.12-.54 1.63-.94l2.39.96 1.92-3.32-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
            </svg>
          </span>
          <span className="player-nav-label">{t("settings")}</span>
        </button>
      </nav>

      <section className="player-content-card">
        {loading ? <p>{t("loading")}</p> : null}
        {pageMessage ? <p className="message-error">{pageMessage}</p> : null}

        {!loading && activeTab === "dashboard" ? (
          <section className="section">
            <div className="scoreboard">
              <div className="scoreboard-panel scoreboard-panel-highlight">
                <span className="scoreboard-label">{t("nextKickoff")}</span>
                <strong className="scoreboard-time">
                  {nextPracticeOrMatch ? formatCountdown(getScheduleDateTime(nextPracticeOrMatch)) : "--"}
                </strong>
                <span className="scoreboard-date">
                  {nextPracticeOrMatch ? getCategoryLabel(nextPracticeOrMatch.category_id) : t("noUpcomingSchedule")}
                </span>
              </div>
            </div>

            <h2 className="section-title">{t("nextEventSection")}</h2>
            {nextEvent ? renderScheduleCard(nextEvent, false) : <p className="subtitle">{t("noUpcomingEvent")}</p>}

            <div className="section-header section-header-spaced">
              <h2 className="section-title">{t("nextScheduleSection")}</h2>
            </div>
            {nextPracticeOrMatch ? (
              <>
                <p className="live-countdown-text">{formatCountdown(getScheduleDateTime(nextPracticeOrMatch))}</p>
                {renderScheduleCard(nextPracticeOrMatch, false)}
              </>
            ) : (
              <p className="subtitle">{t("noUpcomingSchedule")}</p>
            )}

            <div className="section-header section-header-spaced">
              <h2 className="section-title">{t("monthlyParticipantOverview")}</h2>
              {scheduleMonths.length > 0 ? (
                <div className="month-switcher">
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

            <div className="attendance-day-list">
              {monthlyDashboardSchedules.length > 0 ? (
                monthlyDashboardSchedules.map((schedule) => renderScheduleCard(schedule, false))
              ) : (
                <p className="subtitle">{t("noSchedules")}</p>
              )}
            </div>
          </section>
        ) : null}

        {!loading && activeTab === "schedule" ? (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">{t("playerMonthlyScheduleList")}</h2>
              {scheduleMonths.length > 0 ? (
                <div className="month-switcher">
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

            <div className="attendance-day-list">
              {monthlyScheduleList.length > 0 ? (
                monthlyScheduleList.map((schedule) => renderScheduleCard(schedule, true))
              ) : (
                <p className="subtitle">{t("noSchedules")}</p>
              )}
            </div>
          </section>
        ) : null}

        {!loading && activeTab === "profile" ? (
          <section className="section">
            <h2 className="section-title">{t("profile")}</h2>
            <form className="form form-compact" onSubmit={handleProfileSubmit}>
              <div className="player-profile-hero">
                <div className="player-photo-frame">
                  {profileForm.photo_url ? (
                    <img className="player-photo" src={profileForm.photo_url} alt={playerName} />
                  ) : (
                    <div className="player-photo-placeholder">{playerName.slice(0, 1)}</div>
                  )}
                </div>
                <div className="player-profile-identity">
                  <h3 className="attendance-day-title">{playerName}</h3>
                  <p className="summary-meta">
                    {t("age")}: {calculateAge(profileForm.birth_date)}
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <label className="label label-wide">
                  {t("photo")}
                  <input
                    className="input input-compact"
                    value={profileForm.photo_url}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, photo_url: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>
                <label className="label">
                  {t("fullName")}
                  <input className="input input-compact" value={playerName} readOnly />
                </label>
                <label className="label">
                  {t("jerseyName")}
                  <input
                    className="input input-compact"
                    value={profileForm.jersey_name}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, jersey_name: event.target.value }))}
                  />
                </label>
                <label className="label">
                  {t("backNumber")}
                  <input
                    className="input input-compact"
                    value={profileForm.back_number}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, back_number: event.target.value }))}
                  />
                </label>
                <label className="label">
                  {t("jerseySize")}
                  <input
                    className="input input-compact"
                    value={profileForm.jersey_size}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, jersey_size: event.target.value }))}
                  />
                </label>
                <label className="label">
                  {t("birthDate")}
                  <input
                    className="input input-compact"
                    type="date"
                    value={profileForm.birth_date}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, birth_date: event.target.value }))}
                  />
                </label>
                <label className="label">
                  {t("age")}
                  <input className="input input-compact" value={calculateAge(profileForm.birth_date)} readOnly />
                </label>
                <label className="label">
                  {t("nationality")}
                  <input
                    className="input input-compact"
                    value={profileForm.nationality}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, nationality: event.target.value }))}
                  />
                </label>
                <label className="label">
                  {t("position")}
                  <input
                    className="input input-compact"
                    value={profileForm.position}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, position: event.target.value }))}
                  />
                </label>
                <label className="label">
                  {t("currentStatus")}
                  <select
                    className="input input-compact"
                    value={String(profileForm.current_status)}
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        current_status: event.target.value === "true"
                      }))
                    }
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </label>
                <label className="label label-wide">
                  {t("notes")}
                  <textarea
                    className="input input-compact textarea-compact"
                    value={profileForm.remark}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, remark: event.target.value }))}
                  />
                </label>
              </div>

              <button className="button button-compact" type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? t("saving") : t("saveProfile")}
              </button>
            </form>
          </section>
        ) : null}

        {!loading && activeTab === "settings" ? (
          <section className="section">
            <h2 className="section-title">{t("settings")}</h2>
            <div className="settings-grid">
              <div className="summary-card">
                <h3 className="attendance-day-title">{t("language")}</h3>
                <div className="inline-actions settings-language-actions">
                  <button
                    className={`button button-compact ${i18n.language === "ja" ? "" : "button-secondary"}`}
                    type="button"
                    onClick={() => handleLanguageChange("ja")}
                  >
                    {t("japanese")}
                  </button>
                  <button
                    className={`button button-compact ${i18n.language === "en" ? "" : "button-secondary"}`}
                    type="button"
                    onClick={() => handleLanguageChange("en")}
                  >
                    {t("english")}
                  </button>
                </div>
              </div>

              <form className="summary-card form form-compact" onSubmit={handlePasswordSubmit}>
                <h3 className="attendance-day-title">{t("updatePassword")}</h3>
                <label className="label">
                  {t("currentPassword")}
                  <input
                    className="input input-compact"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="label">
                  {t("newPassword")}
                  <input
                    className="input input-compact"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    required
                  />
                </label>
                <button className="button button-compact" type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? t("saving") : t("updatePassword")}
                </button>
              </form>
            </div>
          </section>
        ) : null}
      </section>

      <nav className="player-bottom-nav player-bottom-nav-mobile" aria-label="Player navigation">
        <button
          className={`player-nav-item ${activeTab === "dashboard" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("dashboard")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 13h7V4H4v9Zm9 7h7v-7h-7v7ZM4 20h7v-5H4v5Zm9-9h7V4h-7v7Z" />
            </svg>
          </span>
          <span className="player-nav-label">{t("dashboard")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "schedule" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("schedule")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Zm0-4H6v2h12V6Z" />
            </svg>
          </span>
          <span className="player-nav-label">{t("schedule")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "profile" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("profile")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4Z" />
            </svg>
          </span>
          <span className="player-nav-label">{t("profile")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "settings" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("settings")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58-1.92-3.32-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54h-3.84l-.36 2.54c-.58.22-1.12.54-1.63.94l-2.39-.96-1.92 3.32 2.03 1.58a7.93 7.93 0 0 0 0 1.88l-2.03 1.58 1.92 3.32 2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54h3.84l.36-2.54c.58-.22 1.12-.54 1.63-.94l2.39.96 1.92-3.32-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
            </svg>
          </span>
          <span className="player-nav-label">{t("settings")}</span>
        </button>
      </nav>
    </main>
  );
}
