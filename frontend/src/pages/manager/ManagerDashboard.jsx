import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { bookingsApi, eventTypesApi } from "../../services/api";
import { fmtCurrency, fmtApiDate } from "../../utils/formatters";
import { useFonts } from "../../hooks/useFonts";

// Palette
const C = {
  bg:       "#F5F3FF",
  sidebar:  "#fff",
  dark:     "#1E1B4B",
  mid:      "#4338CA",
  accent:   "#6366F1",
  accentLt: "rgba(99,102,241,0.1)",
  border:   "rgba(99,102,241,0.12)",
  muted:    "rgba(67,56,202,0.45)",
  amber:    "#F59E0B",
};

const STATUS_META = {
  confirmed: { label: "Confirmed",      bg: "rgba(5,150,105,0.1)",  color: "#065F46", dot: "#10B981" },
  pending:   { label: "Pending Review", bg: "rgba(245,158,11,0.1)", color: "#92400E", dot: "#F59E0B" },
  cancelled: { label: "Cancelled",      bg: "rgba(220,38,38,0.1)",  color: "#991B1B", dot: "#EF4444" },
};


function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: meta.bg, color: meta.color, padding: "0.22rem 0.7rem", borderRadius: "100px", fontSize: "0.72rem", fontWeight: 500, whiteSpace: "nowrap" }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: meta.dot, flexShrink: 0 }} />
      {meta.label}
    </span>
  );
}

function LoadingRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: "56px", borderRadius: "8px", background: C.accentLt, animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i*0.1}s` }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 700, color: C.dark, margin: "0 0 0.25rem" }}>{title}</h2>
      {subtitle && <p style={{ fontSize: "0.85rem", color: C.muted, margin: 0, fontWeight: 300 }}>{subtitle}</p>}
    </div>
  );
}

/* Bookings table
   eventTypeMap: { "et1": "Wedding", "et2": "Birthday", ... }
   Passed in from the parent which fetches event types once on mount. */
function BookingsTable({ bookings, conflictIds = new Set(), eventTypeMap = {} }) {
  const navigate = useNavigate();
  if (!bookings.length) return (
    <div style={{ padding: "2rem", textAlign: "center", background: "#fff", border: `1.5px dashed ${C.border}`, borderRadius: "16px" }}>
      <p style={{ color: C.muted, fontSize: "0.9rem", margin: 0 }}>No bookings found.</p>
    </div>
  );

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(130px,1fr) minmax(150px,1.2fr) minmax(110px,0.8fr) minmax(60px,0.6fr) minmax(90px,0.8fr) minmax(120px,1fr) 80px", padding: "0.75rem 1.5rem", borderBottom: `1px solid ${C.border}`, background: "rgba(99,102,241,0.03)" }}>
        {["Customer", "Event / Venue", "Meeting Date", "Guests", "Total", "Status", ""].map(h => (
          <div key={h} style={{ fontSize: "0.7rem", fontWeight: 500, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</div>
        ))}
      </div>

      {bookings.map((b, i) => {
        const customerName = b.user?.name || b.user_id || "—";
        const venueName    = b.venue?.name || b.venue_id || "—";
        // Resolve event type ID → human label using the lookup map.
        // Falls back to the raw ID only if the map hasn't loaded yet.
        const eventLabel   = eventTypeMap[b.event_type_id] || b.event_type_id || "—";
        const isConflict   = conflictIds.has(b.id);
        return (
          <div key={b.id} style={{ display: "grid", gridTemplateColumns: "minmax(130px,1fr) minmax(150px,1.2fr) minmax(110px,0.8fr) minmax(60px,0.6fr) minmax(90px,0.8fr) minmax(120px,1fr) 80px", padding: "1rem 1.5rem", borderBottom: i < bookings.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", transition: "background 0.15s", background: isConflict ? "rgba(239,68,68,0.03)" : "transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.03)"}
            onMouseLeave={e => e.currentTarget.style.background = isConflict ? "rgba(239,68,68,0.03)" : "transparent"}
          >
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 500, color: C.dark }}>{customerName}</div>
              <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 300 }}>{b.booking_reference}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: C.dark }}>{eventLabel}</div>
              <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 300 }}>{venueName}</div>
            </div>
            <div style={{ fontSize: "0.82rem", color: C.dark }}>{fmtApiDate(b.meeting_date)}</div>
            <div style={{ fontSize: "0.82rem", color: C.dark }}>{b.guest_count}</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 500, color: C.mid }}>{fmtCurrency(b.total_estimated_cost)}</div>
            <div><StatusBadge status={b.status} /></div>
            <button onClick={() => navigate(`/manager/booking/${b.id}`)} style={{ background: C.accentLt, border: "none", color: C.mid, borderRadius: "8px", padding: "0.35rem 0.7rem", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, whiteSpace: "nowrap", marginLeft: "10px" }}>
              View →
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Dashboard overview

function DashboardSection({ bookings, conflicts, loading, setActive, user, eventTypeMap }) {
  const confirmed     = bookings.filter(b => b.status === "confirmed").length;
  const pending       = bookings.filter(b => b.status === "pending").length;
  const totalRev      = bookings.filter(b => b.status === "confirmed").reduce((s, b) => s + Number(b.total_estimated_cost || 0), 0);
  const conflictCount = conflicts.reduce((s, g) => s + g.bookings.length, 0);
  const firstName     = user?.name?.split(" ")[0] || "there";

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <span style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent, fontWeight: 500 }}>Manager Portal</span>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: C.dark, margin: "0.3rem 0 0.3rem", lineHeight: 1.1 }}>
          Good morning, {firstName}
        </h2>
        <p style={{ fontSize: "0.88rem", color: C.muted, margin: 0, fontWeight: 300 }}>
          {loading ? "Loading bookings…" : `You have ${pending} booking${pending !== 1 ? "s" : ""} awaiting review.`}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Bookings",  value: loading ? "…" : bookings.length,                          icon: "📋", color: C.accent },
          { label: "Confirmed",       value: loading ? "…" : confirmed,                                 icon: "✓",  color: "#10B981" },
          { label: "Pending Review",  value: loading ? "…" : pending,                                   icon: "⏳", color: C.amber },
          { label: "Conflicts",       value: loading ? "…" : conflictCount,                             icon: "⚠️", color: "#EF4444" },
          { label: "Revenue (conf.)", value: loading ? "…" : `₹${(totalRev/1000).toFixed(0)}k`,         icon: "💰", color: C.mid },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "14px", padding: "1.2rem", boxShadow: "0 2px 8px rgba(99,102,241,0.05)" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>{s.icon}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.7rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 300, marginTop: "3px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Conflict alert banner */}
      {!loading && conflictCount > 0 && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.2)", borderRadius: "14px", padding: "1rem 1.5rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "#991B1B" }}>{conflictCount} booking{conflictCount !== 1 ? "s" : ""} have scheduling conflicts</div>
              <div style={{ fontSize: "0.78rem", color: "rgba(153,27,27,0.6)", fontWeight: 300 }}>Same venue booked on the same date</div>
            </div>
          </div>
          <button onClick={() => setActive("alerts")} style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: "100px", padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>View Alerts</button>
        </div>
      )}

      {/* Recent bookings */}
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 700, color: C.dark, margin: 0 }}>Recent Bookings</h3>
        <button onClick={() => setActive("bookings")} style={{ background: "none", border: "none", color: C.accent, fontSize: "0.82rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>View all →</button>
      </div>
      {loading ? <LoadingRows /> : <BookingsTable bookings={bookings.slice(0, 4)} eventTypeMap={eventTypeMap} />}
    </div>
  );
}

// All Bookings
 
function BookingsSection({ bookings, loading, eventTypeMap }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div>
      <SectionHeader title="All Bookings" subtitle={loading ? "Loading…" : `${bookings.length} total bookings`} />
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {["all", "confirmed", "pending", "cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "0.4rem 1rem", border: `1.5px solid ${filter === f ? C.accent : C.border}`, borderRadius: "100px", background: filter === f ? C.accentLt : "#fff", color: filter === f ? C.mid : "#6B7280", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", fontWeight: filter === f ? 500 : 400, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s" }}>
            {f === "all" ? `All (${bookings.length})` : f}
          </button>
        ))}
      </div>
      {loading ? <LoadingRows /> : <BookingsTable bookings={filtered} eventTypeMap={eventTypeMap} />}
    </div>
  );
}

// Calendar

const MONTH_NAMES_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function CalendarSection({ bookings }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Plot bookings by event_date — the actual day the event happens.
  // Exclude cancelled bookings so the calendar reflects live/active bookings only.
  const activeBookings = bookings.filter(b => b.status !== "cancelled");

  const bookingsByDay = activeBookings.reduce((acc, b) => {
    if (!b.event_date) return acc;
    const [by, bm, bd] = b.event_date.split("-").map(Number);
    if (bm - 1 === month && by === year) {
      if (!acc[bd]) acc[bd] = [];
      acc[bd].push(b);
    }
    return acc;
  }, {});

  // Build a set of event_date strings that have genuine double-bookings
  // (same venue + same event_date, both non-cancelled) so we can highlight them red.
  // We derive this from the bookings we already have rather than a separate fetch.
  const conflictDays = new Set();
  const dayVenueMap = {};
  activeBookings.forEach(b => {
    if (!b.event_date) return;
    const [by, bm, bd] = b.event_date.split("-").map(Number);
    if (bm - 1 !== month || by !== year) return;
    const venueId = b.venue?.id || b.venue_id;
    const key = `${bd}-${venueId}`;
    if (dayVenueMap[key]) {
      conflictDays.add(bd);
    } else {
      dayVenueMap[key] = true;
    }
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <SectionHeader title="Calendar View" subtitle="Scheduled event dates" />
      <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "20px", padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, fontSize: "1.2rem", padding: "4px 10px" }}>‹</button>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 700, color: C.dark }}>{MONTH_NAMES_LONG[month]} {year}</span>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, fontSize: "1.2rem", padding: "4px 10px" }}>›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px", marginBottom: "6px" }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 500, color: C.muted, padding: "4px 0" }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4px" }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const events  = bookingsByDay[day] || [];
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const hasConflict = conflictDays.has(day);
            const cellBg = hasConflict
              ? "rgba(239,68,68,0.06)"
              : events.length > 0
              ? C.accentLt
              : "transparent";
            const cellBorder = isToday
              ? `2px solid ${C.accent}`
              : hasConflict
              ? "1.5px solid rgba(239,68,68,0.3)"
              : `1px solid ${C.border}`;
            return (
              <div key={day} style={{ minHeight: "72px", padding: "6px", borderRadius: "10px", background: cellBg, border: cellBorder }}>
                <div style={{ fontSize: "0.78rem", fontWeight: isToday ? 700 : 400, color: isToday ? C.accent : C.dark, marginBottom: "4px" }}>{day}</div>
                {events.map(e => {
                  const isConflictEntry = conflictDays.has(day);
                  const firstName  = e.user?.name?.split(" ")[0] || e.booking_reference || "Booking";
                  const eventLabel = e.event_type?.label || e.event_type_id || "";
                  const label = eventLabel ? `${firstName} · ${eventLabel}` : firstName;
                  return (
                    <div key={e.id} style={{ fontSize: "0.62rem", fontWeight: 500, color: isConflictEntry ? "#991B1B" : C.mid, background: isConflictEntry ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.12)", borderRadius: "4px", padding: "2px 4px", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {label}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.2rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "4px", background: C.accentLt, border: `1.5px solid ${C.accent}` }} />
            <span style={{ fontSize: "0.75rem", color: C.muted }}>Has booking</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "4px", background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.8)" }} />
            <span style={{ fontSize: "0.75rem", color: C.muted }}>Conflict</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alerts

function AlertsSection({ conflicts, loading }) {
  const conflictCount = conflicts.reduce((s, g) => s + g.bookings.length, 0);

  return (
    <div>
      <SectionHeader
        title="Conflict Alerts"
        subtitle={loading ? "Loading…" : `${conflictCount} bookings with scheduling conflicts`}
      />

      {loading ? <LoadingRows /> : conflicts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "#fff", border: `1.5px dashed ${C.border}`, borderRadius: "16px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div>
          <p style={{ fontSize: "0.9rem", color: C.muted, fontWeight: 300 }}>No conflicts detected.</p>
        </div>
      ) : (
        conflicts.map((group, i) => (
          <div key={i} style={{ background: "#fff", border: "1.5px solid rgba(239,68,68,0.25)", borderRadius: "16px", overflow: "hidden", marginBottom: "1.5rem" }}>
            <div style={{ background: "rgba(239,68,68,0.06)", padding: "0.9rem 1.5rem", borderBottom: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span>⚠️</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#991B1B" }}>
                {group.venue} · {fmtApiDate(group.date)}
              </span>
              <span style={{ background: "#EF4444", color: "#fff", borderRadius: "100px", padding: "0.1rem 0.5rem", fontSize: "0.68rem", fontWeight: 700, marginLeft: "auto" }}>
                {group.bookings.length} bookings
              </span>
            </div>
            {group.bookings.map((b, j) => {
              const customerName = b.user?.name || b.user_id || "Customer";
              return (
                <div key={b.id} style={{ padding: "1rem 1.5rem", borderBottom: j < group.bookings.length - 1 ? "1px solid rgba(239,68,68,0.08)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 500, color: C.dark }}>{customerName}</div>
                    <div style={{ fontSize: "0.75rem", color: C.muted, fontWeight: 300 }}>
                      {b.booking_reference} · {b.guest_count} guests
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <StatusBadge status={b.status} />
                    <span style={{ fontSize: "0.88rem", fontWeight: 500, color: C.mid }}>{fmtCurrency(b.total_estimated_cost)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

// Sidebar 
function Sidebar({ active, setActive, navigate, conflictCount, user }) {
  const { logout } = useAuth();
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "MG";

  const NAV = [
    { id: "dashboard", label: "Dashboard",     icon: "⊞" },
    { id: "bookings",  label: "All Bookings",  icon: "📋" },
    { id: "calendar",  label: "Calendar View", icon: "📅" },
    { id: "alerts",    label: "Alerts",        icon: "🔔", badge: conflictCount },
  ];

  return (
    <aside style={{ width: "230px", flexShrink: 0, background: C.sidebar, borderRight: `1px solid ${C.border}`, padding: "1.5rem 1rem", position: "sticky", top: "60px", height: "calc(100vh - 60px)", overflowY: "auto", display: "flex", flexDirection: "column" }} className="mgr-sidebar">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", background: C.accentLt, borderRadius: "12px", marginBottom: "1.5rem" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #6366F1, #4338CA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 500, color: C.dark }}>{user?.name || "Manager"}</div>
          <div style={{ fontSize: "0.7rem", color: C.muted, fontWeight: 300 }}>Event Manager</div>
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", marginBottom: "2px", background: active === item.id ? C.accentLt : "transparent", border: "none", borderRadius: "10px", color: active === item.id ? C.mid : "#4B5563", fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", fontWeight: active === item.id ? 500 : 400, cursor: "pointer", textAlign: "left", transition: "all 0.15s", borderLeft: active === item.id ? `3px solid ${C.accent}` : "3px solid transparent" }}
            onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = "rgba(99,102,241,0.04)"; }}
            onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <span style={{ fontSize: "1rem" }}>{item.icon}</span>
              {item.label}
            </span>
            {item.badge > 0 && (
              <span style={{ background: "#EF4444", color: "#fff", borderRadius: "100px", padding: "0.1rem 0.5rem", fontSize: "0.68rem", fontWeight: 700 }}>{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <button onClick={() => { logout(); navigate("/staff/login"); }} style={{ width: "100%", padding: "0.7rem", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "10px", color: C.muted, fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", cursor: "pointer", marginTop: "1rem" }}>
        Sign Out
      </button>
    </aside>
  );
}

// Main component
export default function ManagerDashboard() {
  useFonts();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [active, setActive] = useState("dashboard");

  const [bookings,      setBookings]      = useState([]);
  const [conflicts,     setConflicts]     = useState([]);
  const [eventTypeMap,  setEventTypeMap]  = useState({}); // { et1: "Wedding", et2: "Birthday", ... }
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [bookingsRes, conflictsRes, eventTypesRes] = await Promise.all([
          bookingsApi.all(),
          bookingsApi.conflicts(),
          eventTypesApi.list(),
        ]);
        setBookings(bookingsRes.bookings    || []);
        setConflicts(conflictsRes.conflicts || []);

        // Build id → label map from the event types list
        // { et1: "Wedding", et2: "Birthday", et3: "Corporate", et4: "Social Event" }
        const map = {};
        (eventTypesRes.event_types || []).forEach(et => {
          map[et.id] = et.label;
        });
        setEventTypeMap(map);
      } catch {
        setBookings([]);
        setConflicts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const conflictCount = conflicts.reduce((s, g) => s + g.bookings.length, 0);

  const SECTIONS = {
    dashboard: <DashboardSection bookings={bookings} conflicts={conflicts} loading={loading} setActive={setActive} user={user} eventTypeMap={eventTypeMap} />,
    bookings:  <BookingsSection  bookings={bookings} loading={loading} eventTypeMap={eventTypeMap} />,
    calendar:  <CalendarSection  bookings={bookings} />,
    alerts:    <AlertsSection    conflicts={conflicts} loading={loading} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "60px", background: C.dark, display: "flex", alignItems: "center", padding: "0 2rem", justifyContent: "space-between", borderBottom: "1px solid rgba(99,102,241,0.2)", position: "sticky", top: 0, zIndex: 50 }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: C.amber, fontSize: "20px" }}>✦</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: "#FCD34D" }}>Eventura</span>
        </Link>
        <span style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", color: "#A5B4FC", borderRadius: "100px", padding: "0.3rem 0.9rem", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Manager Portal
        </span>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar active={active} setActive={setActive} navigate={navigate} conflictCount={conflictCount} user={user} />
        <main style={{ flex: 1, padding: "2rem clamp(1.5rem, 4vw, 3rem)", maxWidth: "1000px" }} key={active}>
          {SECTIONS[active]}
        </main>
      </div>

      <style>{`@media(max-width: 768px) { .mgr-sidebar { display: none !important; } }`}</style>
    </div>
  );
}
