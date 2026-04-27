import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminApi, bookingsApi } from "../../services/api";
import { fmtCurrency, fmtApiDate } from "../../utils/formatters";
import { useFonts } from "../../hooks/useFonts";

const C = {
  bg: "#F0F4F4", sidebar: "#fff", dark: "#0F2830",
  mid: "#0D9488", accent: "#14B8A6", accentLt: "rgba(20,184,166,0.1)",
  border: "rgba(13,148,136,0.15)", muted: "rgba(15,40,48,0.45)",
  green: "#065F46", red: "#991B1B",
};

const STATUS_META = {
  confirmed: { label: "Confirmed", bg: "rgba(5,150,105,0.1)",  color: "#065F46", dot: "#10B981" },
  pending:   { label: "Pending",   bg: "rgba(245,158,11,0.1)", color: "#92400E", dot: "#F59E0B" },
  cancelled: { label: "Cancelled", bg: "rgba(220,38,38,0.1)",  color: "#991B1B", dot: "#EF4444" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: m.bg, color: m.color, padding: "0.22rem 0.7rem", borderRadius: "100px", fontSize: "0.72rem", fontWeight: 500, whiteSpace: "nowrap" }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

// Skeleton loader component for charts and tables
function Skeleton({ h = "40px", mb = "0" }) {
  return <div style={{ height: h, borderRadius: "10px", background: C.accentLt, animation: "pulse 1.4s ease-in-out infinite", marginBottom: mb }} />;
}

// Revenue bar chart component used in both Dashboard and Revenue sections
function RevenueChart({ revenueData, loading }) {
  if (loading) return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", padding: "1.5rem" }}>
      <Skeleton h="160px" />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );

  if (!revenueData?.length) return null;

  const sorted       = [...revenueData].sort((a, b) => a.month.localeCompare(b.month));
  const current      = sorted[sorted.length - 1];
  const prev         = sorted[sorted.length - 2];
  const maxRev       = Math.max(...sorted.map(m => m.total_revenue));
  const totalRev     = sorted.reduce((s, m) => s + m.total_revenue, 0);
  // Guard against division by zero: if prev month had no revenue, show null (no badge)
  // instead of Infinity% which happens when prev.total_revenue is 0.
  const growth = (prev && prev.total_revenue > 0)
    ? (((current.total_revenue - prev.total_revenue) / prev.total_revenue) * 100).toFixed(1)
    : null;

  // Format "2026-03" → "Mar"
  const shortMonth = (s) => {
    const [y, m] = s.split("-");
    return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short" });
  };

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: "4px" }}>Projected Revenue</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 700, color: C.dark }}>
            ₹{(current.total_revenue / 1000).toFixed(0)}k
          </div>
          {growth !== null && (
            <div style={{ fontSize: "0.78rem", marginTop: "2px", color: parseFloat(growth) >= 0 ? C.green : C.red, fontWeight: 500 }}>
              {parseFloat(growth) >= 0 ? "▲" : "▼"} {Math.abs(growth)}% vs last month
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.72rem", color: C.muted, marginBottom: "4px" }}>{sorted.length}-month total</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: C.mid }}>
            ₹{(totalRev / 100000).toFixed(1)}L
          </div>
        </div>
      </div>

      {/* Bars */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.6rem", height: "120px" }}>
        {sorted.map((m, i) => {
          const isLast    = i === sorted.length - 1;
          const heightPct = maxRev > 0 ? (m.total_revenue / maxRev) * 100 : 0;
          return (
            <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                <div style={{ width: "100%", height: `${heightPct}%`, background: isLast ? "linear-gradient(to top, #0D9488, #14B8A6)" : "rgba(20,184,166,0.12)", borderRadius: "6px 6px 0 0", transition: "height 0.4s ease", position: "relative", minHeight: "4px" }}>
                  {isLast && (
                    <div style={{ position: "absolute", top: "-24px", left: "50%", transform: "translateX(-50%)", fontSize: "0.65rem", fontWeight: 600, color: C.mid, whiteSpace: "nowrap" }}>
                      ₹{(m.total_revenue / 1000).toFixed(0)}k
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "0.7rem", color: C.muted, fontWeight: isLast ? 600 : 300 }}>{shortMonth(m.month)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Scheduled Table component used in both Dashboard and Scheduled sections
function ScheduledTable({ bookings }) {
  if (!bookings.length) return (
    <div style={{ padding: "2rem", textAlign: "center", background: "#fff", border: `1.5px dashed ${C.border}`, borderRadius: "16px" }}>
      <p style={{ color: C.muted, fontSize: "0.9rem", margin: 0 }}>No events found.</p>
    </div>
  );
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.3fr 0.9fr 0.9fr 0.7fr", padding: "0.75rem 1.5rem", borderBottom: `1px solid ${C.border}`, background: C.accentLt }}>
        {["Customer", "Event / Venue", "Event Date", "Total", "Status"].map(h => (
          <div key={h} style={{ fontSize: "0.7rem", fontWeight: 500, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</div>
        ))}
      </div>
      {bookings.map((b, i) => {
        const customerName = b.user?.name || b.user_id || "—";
        const venueName    = b.venue?.name || b.venue_id || "—";
        return (
          <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.3fr 0.9fr 0.9fr 0.7fr", padding: "0.9rem 1.5rem", borderBottom: i < bookings.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = C.accentLt}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ fontSize: "0.88rem", fontWeight: 500, color: C.dark }}>{customerName}</div>
            <div>
              <div style={{ fontSize: "0.85rem", color: C.dark }}>
                {b.event_type?.label || b.event_type_id || "—"}
              </div>
              <div style={{ fontSize: "0.72rem", color: C.muted, fontWeight: 300 }}>{venueName}</div>
            </div>
            <div style={{ fontSize: "0.82rem", color: C.dark }}>{fmtApiDate(b.event_date)}</div>
            <div style={{ fontSize: "0.88rem", fontWeight: 500, color: C.mid }}>{fmtCurrency(b.total_estimated_cost)}</div>
            <StatusBadge status={b.status} />
          </div>
        );
      })}
    </div>
  );
}

// Section components
function DashboardSection({ stats, revenueData, bookings, loading, setActive }) {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <span style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.mid, fontWeight: 500 }}>Admin Portal</span>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: C.dark, margin: "0.3rem 0 0.3rem", lineHeight: 1.1 }}>Business Overview</h2>
        <p style={{ fontSize: "0.88rem", color: C.muted, margin: 0, fontWeight: 300 }}>Track revenue, bookings and operations at a glance.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Bookings",  value: loading ? "…" : stats?.total_bookings ?? 0,                                              icon: "📋", color: C.accent },
          { label: "Confirmed",       value: loading ? "…" : stats?.confirmed ?? 0,                                                   icon: "✓",  color: "#10B981" },
          { label: "Pending",         value: loading ? "…" : stats?.pending ?? 0,                                                     icon: "⏳", color: "#F59E0B" },
          { label: "Proj. Revenue",   value: loading ? "…" : `₹${((stats?.projected_revenue ?? 0) / 100000).toFixed(1)}L`,          icon: "📈", color: C.mid },
          { label: "Confirmed Rev.",  value: loading ? "…" : `₹${((stats?.confirmed_revenue ?? 0) / 1000).toFixed(0)}k`,             icon: "💰", color: "#065F46" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "14px", padding: "1.2rem", boxShadow: "0 2px 8px rgba(28,10,0,0.04)" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>{s.icon}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.7rem", fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: "0.7rem", color: C.muted, fontWeight: 300, marginTop: "3px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div style={{ marginBottom: "2rem" }}>
        <RevenueChart revenueData={revenueData} loading={loading} />
      </div>

      {/* Recent bookings */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 700, color: C.dark, margin: 0 }}>Scheduled Events</h3>
        <button onClick={() => setActive("scheduled")} style={{ background: "none", border: "none", color: C.mid, fontSize: "0.82rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>View all →</button>
      </div>
      {loading
        ? <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>{[1,2,3].map(i => <Skeleton key={i} h="52px" />)}</div>
        : <ScheduledTable bookings={bookings.slice(0, 4)} />
      }
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

function ScheduledSection({ bookings, loading }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 700, color: C.dark, margin: "0 0 0.25rem" }}>Scheduled Events</h2>
        <p style={{ fontSize: "0.85rem", color: C.muted, margin: 0, fontWeight: 300 }}>{loading ? "Loading…" : `${bookings.length} total events`}</p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {["all", "confirmed", "pending", "cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "0.4rem 1rem", border: `1.5px solid ${filter === f ? C.accent : C.border}`, borderRadius: "100px", background: filter === f ? C.accentLt : "#fff", color: filter === f ? C.mid : "#6B7280", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", fontWeight: filter === f ? 500 : 400, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s" }}>
            {f === "all" ? `All (${bookings.length})` : f}
          </button>
        ))}
      </div>
      {loading
        ? <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>{[1,2,3].map(i => <Skeleton key={i} h="52px" />)}</div>
        : <ScheduledTable bookings={filtered} />
      }
    </div>
  );
}

function RevenueSection({ revenueData, loading }) {
  const sorted = [...(revenueData || [])].sort((a, b) => b.month.localeCompare(a.month));
  const total  = sorted.reduce((s, m) => s + m.total_revenue, 0);
  const totalBookings = sorted.reduce((s, m) => s + m.booking_count, 0);

  const shortMonth = (s) => {
    const [y, m] = s.split("-");
    return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 700, color: C.dark, margin: "0 0 0.25rem" }}>Revenue Reports</h2>
        <p style={{ fontSize: "0.85rem", color: C.muted, margin: 0, fontWeight: 300 }}>Last {sorted.length} months performance</p>
      </div>
      <RevenueChart revenueData={revenueData} loading={loading} />

      {/* Monthly breakdown table */}
      {!loading && sorted.length > 0 && (
        <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", overflow: "hidden", marginTop: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "0.75rem 1.5rem", borderBottom: `1px solid ${C.border}`, background: C.accentLt }}>
            {["Month", "Bookings", "Proj. Revenue", "Avg. per Booking"].map(h => (
              <div key={h} style={{ fontSize: "0.7rem", fontWeight: 500, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>
          {sorted.map((m, i) => (
            <div key={m.month} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "0.9rem 1.5rem", borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center", background: i === 0 ? C.accentLt : "transparent" }}>
              <div style={{ fontSize: "0.88rem", fontWeight: i === 0 ? 500 : 400, color: C.dark }}>
                {shortMonth(m.month)} {i === 0 && <span style={{ fontSize: "0.7rem", color: C.mid }}>(current)</span>}
              </div>
              <div style={{ fontSize: "0.85rem", color: C.dark }}>{m.booking_count}</div>
              <div style={{ fontSize: "0.88rem", fontWeight: 500, color: C.mid }}>{fmtCurrency(m.total_revenue)}</div>
              <div style={{ fontSize: "0.85rem", color: C.dark }}>{m.avg_per_booking > 0 ? fmtCurrency(m.avg_per_booking) : "—"}</div>
            </div>
          ))}
          {/* Total row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "0.9rem 1.5rem", borderTop: `2px solid ${C.border}`, background: "rgba(217,119,6,0.05)" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: C.dark }}>{sorted.length}-Month Total</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: C.dark }}>{totalBookings}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 700, color: C.mid }}>{fmtCurrency(total)}</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: C.dark }}>{totalBookings > 0 ? fmtCurrency(Math.round(total / totalBookings)) : "—"}</div>
            {/* Note: total row avg uses projected revenue ÷ all bookings for rough comparison */}
          </div>
        </div>
      )}
    </div>
  );
}

// Sidebar navigation items
const NAV = [
  { id: "dashboard", label: "Overview",          icon: "⊞" },
  { id: "scheduled", label: "Scheduled Events",  icon: "📅" },
  { id: "revenue",   label: "Revenue Reports",   icon: "📈" },
  { id: "venues",    label: "Venue Management",  icon: "🏛️",  link: "/admin/venues" },
  { id: "content",   label: "Content Management",icon: "🎨",  link: "/admin/content" },
];

function Sidebar({ active, setActive, navigate, user }) {
  const { logout } = useAuth();
  const initials = user?.name ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "AD";

  return (
    <aside style={{ width: "250px", flexShrink: 0, background: "#fff", borderRight: `1px solid ${C.border}`, padding: "1.5rem 1rem", position: "sticky", top: "60px", height: "calc(100vh - 60px)", overflowY: "auto", display: "flex", flexDirection: "column" }} className="admin-sidebar">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", background: C.accentLt, borderRadius: "12px", marginBottom: "1.5rem" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #14B8A6, #0D9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: "#1C1917", flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 500, color: C.dark }}>{user?.name || "Admin"}</div>
          <div style={{ fontSize: "0.7rem", color: C.muted, fontWeight: 300 }}>Administrator</div>
        </div>
      </div>
      <nav style={{ flex: 1 }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => item.link ? navigate(item.link) : setActive(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.75rem 1rem", marginBottom: "2px", background: active === item.id ? C.accentLt : "transparent", border: "none", borderRadius: "10px", color: active === item.id ? C.mid : "#6B7280", fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", fontWeight: active === item.id ? 500 : 400, cursor: "pointer", textAlign: "left", transition: "all 0.15s", borderLeft: active === item.id ? `3px solid ${C.accent}` : "3px solid transparent" }}
            onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = "rgba(245,158,11,0.04)"; }}
            onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: "1rem" }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <button onClick={() => { logout(); navigate("/staff/login"); }} style={{ width: "100%", padding: "0.7rem", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "10px", color: C.muted, fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", cursor: "pointer", marginTop: "1rem" }}>Sign Out</button>
    </aside>
  );
}

// Main component
export default function AdminDashboard() {
  useFonts();
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [active,      setActive]      = useState("dashboard");
  const [stats,       setStats]       = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, revenueRes, bookingsRes] = await Promise.all([
          adminApi.stats(),
          adminApi.revenue(6),
          bookingsApi.all(),
        ]);
        setStats(statsRes);
        setRevenueData(revenueRes.revenue || []);
        setBookings(bookingsRes.bookings  || []);
      } catch {
        // leave defaults — UI handles empty gracefully
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const SECTIONS = {
    dashboard: <DashboardSection stats={stats} revenueData={revenueData} bookings={bookings} loading={loading} setActive={setActive} />,
    scheduled: <ScheduledSection bookings={bookings} loading={loading} />,
    revenue:   <RevenueSection   revenueData={revenueData} loading={loading} />,
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "60px", background: C.dark, display: "flex", alignItems: "center", padding: "0 2rem", justifyContent: "space-between", borderBottom: "1px solid rgba(245,158,11,0.15)", position: "sticky", top: 0, zIndex: 50 }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#F59E0B", fontSize: "20px" }}>✦</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: "#FCD34D" }}>Eventura</span>
        </Link>
        <span style={{ background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.25)", color: "#0D9488", borderRadius: "100px", padding: "0.3rem 0.9rem", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin Portal</span>
      </div>
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar active={active} setActive={setActive} navigate={navigate} user={user} />
        <main style={{ flex: 1, padding: "2rem clamp(1.5rem, 4vw, 3rem)", maxWidth: "1000px" }} key={active}>
          {SECTIONS[active]}
        </main>
      </div>
      <style>{`@media(max-width:768px){.admin-sidebar{display:none!important}}`}</style>
    </div>
  );
}
