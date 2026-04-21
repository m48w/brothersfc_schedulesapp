import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ChangeEvent } from "react";
import { FaCalendarDays, FaEye, FaGear, FaHouse, FaPen, FaUser } from "react-icons/fa6";
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
import { ClubLogo } from "../components/ClubLogo";

type PlayerTab = "dashboard" | "schedule" | "profile" | "settings";
type AttendanceStatus = "present" | "absent" | "late";
type ProfileMode = "view" | "edit";

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
  const [profileMode, setProfileMode] = useState<ProfileMode>("view");

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

  const getVoteDeadlineDateTime = (schedule: ScheduleItem) => new Date(schedule.vote_deadline);

  const isAttendanceOpen = (schedule: ScheduleItem) =>
    getVoteDeadlineDateTime(schedule).getTime() > currentTime.getTime();

  const getAttendanceWindowMessage = (schedule: ScheduleItem) =>
    isAttendanceOpen(schedule)
      ? i18n.language === "ja"
        ? "期限内のため、出欠は更新できます。"
        : "Attendance can be updated until the vote deadline."
      : i18n.language === "ja"
        ? "出欠受付を終了したため、出欠は変更できません。"
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

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const photoDataUrl = reader.result;
      if (typeof photoDataUrl === "string") {
        setProfileForm((prev) => ({ ...prev, photo_url: photoDataUrl }));
      }
    };
    reader.readAsDataURL(file);
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

  const formatCompactDate = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);
    return parsed.toLocaleDateString(i18n.language === "ja" ? "ja-JP" : "en-US", {
      month: "short",
      day: "numeric",
      weekday: "short"
    });
  };

  const renderScheduleCard = (schedule: ScheduleItem, variant: "dashboard" | "schedule") => {
    const participants = getParticipants(schedule.id);
    const myAttendance = attendanceByScheduleAndUser[`${schedule.id}:${playerUserId}`];
    const locationMaster = schedule.location_id ? locationById[schedule.location_id] : null;
    const attendanceOpen = isAttendanceOpen(schedule);
    const isScheduleView = variant === "schedule";

    return (
      <article
        className={`player-schedule-card ${isScheduleView ? "player-schedule-card-compact" : "player-schedule-card-detailed"}`}
        key={schedule.id}
      >
        <div className="player-schedule-header">
          {isScheduleView ? (
            <div className="player-schedule-date-badge">
              <strong>{formatCompactDate(schedule.schedule_date)}</strong>
              <span>{formatTimeRange(schedule)}</span>
            </div>
          ) : null}
          <div className="player-schedule-main">
            <span className={`category-pill category-pill-${getCategoryCode(schedule.category_id)}`}>
              {getCategoryLabel(schedule.category_id)}
            </span>
            <h3 className="attendance-day-title">{isScheduleView ? getCategoryLabel(schedule.category_id) : schedule.schedule_date}</h3>
            {isScheduleView ? (
              <>
                <div className="player-schedule-meta-grid">
                  <span className="player-schedule-meta-chip">{schedule.schedule_date}</span>
                  <span className="player-schedule-meta-chip">{formatTimeRange(schedule)}</span>
                  <span className="player-schedule-meta-chip">
                    {locationMaster?.facility_name ?? t("noLocation")}
                  </span>
                </div>
                <p className="summary-meta">
                  {t("voteDeadline")}:{" "}
                  {getVoteDeadlineDateTime(schedule).toLocaleString(i18n.language === "ja" ? "ja-JP" : "en-US")}
                </p>
                {schedule.description ? <p className="player-schedule-description">{schedule.description}</p> : null}
                {locationMaster?.map_url ? (
                  <a className="map-link" href={locationMaster.map_url ?? "#"} target="_blank" rel="noreferrer">
                    {locationMaster.facility_name}
                  </a>
                ) : null}
              </>
            ) : (
              <>
                <p className="summary-meta">{formatTimeRange(schedule)}</p>
                <p className="summary-meta">
                  {t("voteDeadline")}:{" "}
                  {getVoteDeadlineDateTime(schedule).toLocaleString(i18n.language === "ja" ? "ja-JP" : "en-US")}
                </p>
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
              </>
            )}
          </div>
          {!isScheduleView ? (
            <div className="attendance-count-box">
              <span>{t("participantsTotal")}</span>
              <strong>{participants.length}</strong>
            </div>
          ) : null}
        </div>

        {!isScheduleView ? (
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
        ) : null}

        {isScheduleView ? (
          <div className="attendance-action-row attendance-action-row-compact">
            <span className={`attendance-window-note ${attendanceOpen ? "attendance-window-note-open" : "attendance-window-note-closed"}`}>
              {getAttendanceWindowMessage(schedule)}
            </span>
            {attendanceOpen ? (
              <div className="inline-actions">
                {ATTENDANCE_OPEN_STATUSES.map((status) => {
                  const isSelected = myAttendance?.status === status;
                  const isUnanswered = !myAttendance;
                  
                  let btnClass = "button button-compact";
                  if (isSelected) {
                    // keep primary style for the selected option
                  } else if (isUnanswered) {
                    // default style if no vote yet
                    if (status === "absent") btnClass += " button-secondary";
                  } else {
                    // dim non-selected options
                    btnClass += " button-secondary";
                  }

                  return (
                    <button
                      key={`${schedule.id}-${status}`}
                      className={btnClass}
                      type="button"
                      disabled={savingAttendanceScheduleId === schedule.id}
                      onClick={() => void handleAttendanceSubmit(schedule.id, schedule.schedule_date, status)}
                    >
                      {status === "present" ? t("join") : t("absent")}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="attendance-action-row">
            <span className={`attendance-status-chip ${attendanceOpen ? "attendance-status-chip-open" : "attendance-status-chip-closed"}`}>
              {t("yourAttendanceStatus")}: {myAttendance ? t(myAttendance.status) : t("notAnswered")}
            </span>
            <span className={`attendance-window-note ${attendanceOpen ? "attendance-window-note-open" : "attendance-window-note-closed"}`}>
              {getAttendanceWindowMessage(schedule)}
            </span>
          </div>
        )}
      </article>
    );
  };

  return (
    <main className="player-app-shell">
      <header className="player-header">
        <ClubLogo className="player-logo-badge" />
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
            <FaHouse />
          </span>
          <span className="player-nav-label">{t("home")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "schedule" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("schedule")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <FaCalendarDays />
          </span>
          <span className="player-nav-label">{t("schedule")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "profile" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("profile")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <FaUser />
          </span>
          <span className="player-nav-label">{t("profile")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "settings" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("settings")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <FaGear />
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
            {nextEvent ? renderScheduleCard(nextEvent, "dashboard") : <p className="subtitle">{t("noUpcomingEvent")}</p>}

            <div className="section-header section-header-spaced">
              <h2 className="section-title">{t("nextScheduleSection")}</h2>
            </div>
            {nextPracticeOrMatch ? (
              <>
                <p className="live-countdown-text">{formatCountdown(getScheduleDateTime(nextPracticeOrMatch))}</p>
                {renderScheduleCard(nextPracticeOrMatch, "dashboard")}
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
                monthlyDashboardSchedules.map((schedule) => renderScheduleCard(schedule, "dashboard"))
              ) : (
                <p className="subtitle">{t("noSchedules")}</p>
              )}
            </div>
          </section>
        ) : null}

        {!loading && activeTab === "schedule" ? (
          <section className="section">
            <div className="section-header section-header-spaced">
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
            <p className="player-schedule-screen-intro">
              {i18n.language === "ja"
                ? "見やすさを優先して、日付・時間・場所と回答操作だけをまとめて表示しています。"
                : "This view focuses on date, time, location, and quick attendance actions."}
            </p>

            <div className="attendance-day-list player-schedule-list-compact">
              {monthlyScheduleList.length > 0 ? (
                monthlyScheduleList.map((schedule) => renderScheduleCard(schedule, "schedule"))
              ) : (
                <p className="subtitle">{t("noSchedules")}</p>
              )}
            </div>
          </section>
        ) : null}

        {!loading && activeTab === "profile" ? (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">{t("profile")}</h2>
              <div className="inline-actions">
                <button
                  className={`button button-compact ${profileMode === "view" ? "" : "button-secondary"}`}
                  type="button"
                  onClick={() => setProfileMode("view")}
                >
                  <FaEye />
                  <span>{t("viewMode")}</span>
                </button>
                <button
                  className={`button button-compact ${profileMode === "edit" ? "" : "button-secondary"}`}
                  type="button"
                  onClick={() => setProfileMode("edit")}
                >
                  <FaPen />
                  <span>{t("editMode")}</span>
                </button>
              </div>
            </div>

            {profileMode === "view" ? (
              <div className="summary-card player-profile-view-card">
                <div className="player-profile-hero">
                  <div className="player-photo-frame">
                    {profileForm.photo_url ? (
                      <img className="player-photo" src={profileForm.photo_url} alt={playerName} />
                    ) : (
                      <div className="player-photo-placeholder">{playerName.slice(0, 1)}</div>
                    )}
                  </div>
                  <div className="player-profile-identity">
                    <h3 className="attendance-day-title">{playerName || "-"}</h3>
                    <p className="summary-meta">
                      {t("backNumber")}: {profileForm.back_number || "-"}
                    </p>
                    <p className="summary-meta">
                      {t("age")}: {calculateAge(profileForm.birth_date)}
                    </p>
                  </div>
                </div>

                <div className="player-profile-view-grid">
                  <div className="player-profile-view-item">
                    <span>{t("fullName")}</span>
                    <strong>{playerName || "-"}</strong>
                  </div>
                  <div className="player-profile-view-item">
                    <span>{t("backNumber")}</span>
                    <strong>{profileForm.back_number || "-"}</strong>
                  </div>
                  <div className="player-profile-view-item">
                    <span>{t("age")}</span>
                    <strong>{calculateAge(profileForm.birth_date)}</strong>
                  </div>
                  <div className="player-profile-view-item">
                    <span>{t("birthDate")}</span>
                    <strong>{profileForm.birth_date || "-"}</strong>
                  </div>
                  <div className="player-profile-view-item">
                    <span>{t("position")}</span>
                    <strong>{profileForm.position || "-"}</strong>
                  </div>
                  <div className="player-profile-view-item">
                    <span>{t("nationality")}</span>
                    <strong>{profileForm.nationality || "-"}</strong>
                  </div>
                  <div className="player-profile-view-item player-profile-view-item-wide">
                    <span>{t("notes")}</span>
                    <strong>{profileForm.remark || "-"}</strong>
                  </div>
                </div>
              </div>
            ) : (
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
                    {t("photoUpload")}
                    <input className="input input-compact" type="file" accept="image/*" onChange={handlePhotoUpload} />
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
            )}
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
            <FaHouse />
          </span>
          <span className="player-nav-label">{t("home")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "schedule" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("schedule")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <FaCalendarDays />
          </span>
          <span className="player-nav-label">{t("schedule")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "profile" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("profile")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <FaUser />
          </span>
          <span className="player-nav-label">{t("profile")}</span>
        </button>
        <button
          className={`player-nav-item ${activeTab === "settings" ? "player-nav-item-active" : ""}`}
          type="button"
          onClick={() => setActiveTab("settings")}
        >
          <span className="player-nav-icon" aria-hidden="true">
            <FaGear />
          </span>
          <span className="player-nav-label">{t("settings")}</span>
        </button>
      </nav>
    </main>
  );
}



