import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { bookingsApi } from "../../services/api";
import ChatWidget from '../../components/ChatWidget';
import { useFonts } from "../../hooks/useFonts";

const STATUS_META = {
  confirmed: { label: "Confirmed",      bg: "rgba(5,150,105,0.1)",  color: "#065F46", dot: "#10B981" },
  pending:   { label: "Pending Review", bg: "rgba(217,119,6,0.1)",  color: "#92400E", dot: "#F59E0B" },
  cancelled: { label: "Cancelled",      bg: "rgba(220,38,38,0.1)",  color: "#991B1B", dot: "#EF4444" },
};

function formatCurrency(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

function formatApiDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

/* Status badge */
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      background: meta.bg, color: meta.color,
      padding: "0.25rem 0.75rem", borderRadius: "100px",
      fontSize: "0.75rem", fontWeight: 500,
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: meta.dot, flexShrink: 0 }} />
      {meta.label}
    </span>
  );
}

/* Shared section header */
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h2 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "1.8rem", fontWeight: 700,
        color: "#1C0A00", margin: "0 0 0.25rem",
      }}>{title}</h2>
      {subtitle && (
        <p style={{ fontSize: "0.85rem", color: "#92400E", margin: 0, fontWeight: 300 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* Empty state */
function EmptyState({ message }) {
  return (
    <div style={{
      textAlign: "center", padding: "3rem",
      background: "#fff",
      border: "1.5px solid rgba(217,119,6,0.12)",
      borderRadius: "16px",
    }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✦</div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", color: "#1C0A00", margin: "0 0 0.5rem" }}>No bookings yet</h3>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.9rem", color: "#92400E",
        fontWeight: 300, margin: "0 0 1.2rem",
      }}>{message}</p>
      <Link to="/plan" style={{
        display: "inline-block",
        background: "linear-gradient(135deg, #F59E0B, #D97706)",
        color: "#1C1917", padding: "0.65rem 1.5rem",
        borderRadius: "100px", fontWeight: 500,
        fontSize: "0.85rem", textDecoration: "none",
      }}>Start Planning →</Link>
    </div>
  );
}

/* Booking card */
function BookingCard({ booking }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid rgba(217,119,6,0.15)",
      borderRadius: "16px", overflow: "hidden",
      transition: "box-shadow 0.2s",
      marginBottom: "1rem",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(28,10,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{
        padding: "1.2rem 1.5rem",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: "0.75rem",
        cursor: "pointer",
      }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "12px",
            background: "rgba(217,119,6,0.08)",
            display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1.3rem", flexShrink: 0,
          }}>🎊</div>
          <div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.15rem", fontWeight: 700,
              color: "#1C0A00", marginBottom: "2px",
            }}>Booking #{booking.booking_reference}</div>
            <div style={{
              fontSize: "0.78rem", color: "#92400E",
              fontWeight: 300, display: "flex", gap: "0.75rem", flexWrap: "wrap",
            }}>
              <span>📅 Meeting: {formatApiDate(booking.meeting_date) || "—"}</span>
              <span>👥 {booking.guest_count} guests</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <StatusBadge status={booking.status} />
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.2rem", fontWeight: 700, color: "#1C0A00",
          }}>{formatCurrency(booking.total_estimated_cost)}</span>
          <span style={{
            color: "#D97706", fontSize: "0.8rem",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s", display: "inline-block",
          }}>▼</span>
        </div>
      </div>

      {expanded && (
        <div style={{
          padding: "1.2rem 1.5rem",
          borderTop: "1px solid rgba(217,119,6,0.1)",
          background: "#FFFBEB",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "1rem",
          animation: "fadeDown 0.2s ease both",
        }}>
          {[
            { label: "Meeting Date", value: formatApiDate(booking.meeting_date) },
            { label: "Meeting Time", value: booking.meeting_time },
            { label: "Guest Count",  value: `${booking.guest_count} guests` },
            { label: "Total Cost",   value: formatCurrency(booking.total_estimated_cost) },
            { label: "Notes",        value: booking.meeting_notes || "None" },
            { label: "Event Date",    value: formatApiDate(booking.event_date) },
          ].map(item => (
            <div key={item.label}>
              <div style={{
                fontSize: "0.72rem", letterSpacing: "0.08em",
                textTransform: "uppercase", color: "rgba(120,53,15,0.5)",
                marginBottom: "3px",
              }}>{item.label}</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "#1C0A00" }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sections

function OverviewSection({ user, bookings, loading }) {
  const upcoming  = bookings.filter(b => b.status === "pending" || b.status === "confirmed");
  const confirmed = bookings.filter(b => b.status === "confirmed").length;
  const totalSpent = bookings
    .filter(b => b.status === "confirmed")
    .reduce((s, b) => s + Number(b.total_estimated_cost || 0), 0);

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: "linear-gradient(135deg, #1C0A00 0%, #3D1A00 100%)",
        borderRadius: "20px", padding: "2rem 2.5rem",
        marginBottom: "2rem", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "-20%", right: "-5%",
          width: "220px", height: "220px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          fontSize: "0.75rem", letterSpacing: "0.1em",
          textTransform: "uppercase", color: "rgba(255,251,235,0.4)",
          marginBottom: "0.4rem",
        }}>Welcome back</div>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
          fontWeight: 700, color: "#FFFBEB",
          margin: "0 0 0.5rem",
        }}>
          {loading ? "…" : user?.name?.split(" ")[0] || "there"}! 👋
        </h2>
        <p style={{
          fontSize: "0.88rem", color: "rgba(255,251,235,0.5)",
          margin: "0 0 1.5rem", fontWeight: 300,
        }}>
          {loading ? "" : `You have ${upcoming.length} upcoming event${upcoming.length !== 1 ? "s" : ""}.`}
        </p>
        <Link to="/plan" style={{
          display: "inline-block",
          background: "linear-gradient(135deg, #F59E0B, #D97706)",
          color: "#1C1917", padding: "0.65rem 1.5rem",
          borderRadius: "100px", fontWeight: 500,
          fontSize: "0.88rem", textDecoration: "none",
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: "0 4px 14px rgba(245,158,11,0.35)",
        }}>+ Plan a New Event</Link>
      </div>

      {/* Stat cards — matching original labels */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "1rem", marginBottom: "2.5rem",
      }}>
        {[
          { label: "Total Events", value: loading ? "…" : bookings.length,           icon: "🎉" },
          { label: "Upcoming",     value: loading ? "…" : upcoming.length,            icon: "📅" },
          { label: "Confirmed",    value: loading ? "…" : confirmed,                  icon: "✓"  },
          { label: "Total Spent",  value: loading ? "…" : formatCurrency(totalSpent), icon: "💰" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "#fff",
            border: "1.5px solid rgba(217,119,6,0.12)",
            borderRadius: "14px", padding: "1.2rem",
            boxShadow: "0 2px 8px rgba(28,10,0,0.04)",
          }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{stat.icon}</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.6rem", fontWeight: 700,
              color: "#D97706", lineHeight: 1,
            }}>{stat.value}</div>
            <div style={{ fontSize: "0.75rem", color: "#92400E", fontWeight: 300, marginTop: "3px" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming preview */}
      <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1.4rem", fontWeight: 700,
          color: "#1C0A00", margin: 0,
        }}>Recent Bookings</h3>
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[1,2].map(i => (
            <div key={i} style={{ height: "80px", borderRadius: "16px", background: "rgba(217,119,6,0.08)", animation: "pulse 1.4s ease-in-out infinite" }} />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState message="Start planning your first event today!" />
      ) : (
        upcoming.map(b => <BookingCard key={b.id} booking={b} />)
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

function UpcomingSection({ bookings, loading }) {
  const upcoming = bookings.filter(b => b.status === "pending" || b.status === "confirmed");
  return (
    <div>
      <SectionHeader
        title="Upcoming Events"
        subtitle={loading ? "Loading…" : `${upcoming.length} event${upcoming.length !== 1 ? "s" : ""} scheduled`}
      />
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#92400E", fontSize: "0.9rem" }}>Loading…</div>
      ) : upcoming.length === 0 ? (
        <EmptyState message="Start planning your first event today!" />
      ) : (
        upcoming.map(b => <BookingCard key={b.id} booking={b} />)
      )}
    </div>
  );
}

function PastSection({ bookings, loading }) {
  const past = bookings.filter(b => b.status === "cancelled");
  return (
    <div>
      <SectionHeader
        title="Booking History"
        subtitle={loading ? "Loading…" : `${past.length} past booking${past.length !== 1 ? "s" : ""}`}
      />
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#92400E", fontSize: "0.9rem" }}>Loading…</div>
      ) : past.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "rgba(120,53,15,0.5)", fontSize: "0.9rem" }}>
          No cancelled bookings.
        </div>
      ) : (
        past.map(b => <BookingCard key={b.id} booking={b} />)
      )}
    </div>
  );
}

function ProfileSection({ user, loading }) {
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const fields = [
    { label: "Full Name", value: user?.name },
    { label: "Email",     value: user?.email },
    { label: "Phone",     value: user?.phone },
    { label: "Role",      value: user?.role  },
  ];

  return (
    <div>
      <SectionHeader title="My Profile" subtitle="Your account details" />
      <div style={{
        background: "#fff",
        border: "1.5px solid rgba(217,119,6,0.15)",
        borderRadius: "20px", overflow: "hidden",
      }}>
        {/* Profile header banner */}
        <div style={{
          background: "linear-gradient(135deg, #1C0A00, #3D1A00)",
          padding: "1.5rem 2rem 4.5rem",
          position: "relative",
        }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.8rem", fontWeight: 700, color: "#1C1917",
          }}>
            {loading ? "…" : initials}
          </div>
          <div style={{ position: "absolute", bottom: "1.25rem", left: "2rem" }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.4rem", fontWeight: 700, color: "#FFFBEB",
            }}>{loading ? "" : user?.name}</div>
          </div>
        </div>

        {/* Read-only fields */}
        <div style={{ padding: "1.5rem 2rem" }}>
          {fields.map(field => (
            <div key={field.label} style={{ marginBottom: "1.2rem" }}>
              <label style={{
                display: "block", fontSize: "0.78rem",
                fontWeight: 500, color: "#3D1A00",
                marginBottom: "0.4rem", letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>{field.label}</label>
              <div style={{
                fontSize: "0.95rem", color: "#1C0A00",
                padding: "0.5rem 0",
                borderBottom: "1px solid rgba(217,119,6,0.08)",
                textTransform: field.label === "Role" ? "capitalize" : "none",
              }}>
                {loading ? "…" : (field.value || "—")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Nav items
const NAV_ITEMS = [
  { id: "overview", label: "Overview",       icon: "⊞" },
  { id: "upcoming", label: "Upcoming Events", icon: "📅" },
  { id: "past",     label: "Booking History", icon: "🕐" },
  { id: "profile",  label: "My Profile",      icon: "👤" },
];

// Main dashboard component
export default function CustomerDashboard() {
  useFonts();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] = useState("overview");
  const [bookings,      setBookings]      = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await bookingsApi.my();
        setBookings(res.bookings || []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const SECTIONS = {
    overview: <OverviewSection user={user} bookings={bookings} loading={loading} />,
    upcoming: <UpcomingSection bookings={bookings} loading={loading} />,
    past:     <PastSection     bookings={bookings} loading={loading} />,
    profile:  <ProfileSection  user={user} loading={loading} />,
  };

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div style={{
      minHeight: "100vh", background: "#FFF8EE",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{
        height: "60px", background: "#1C0A00",
        display: "flex", alignItems: "center",
        padding: "0 2rem", justifyContent: "space-between",
        borderBottom: "1px solid rgba(245,158,11,0.15)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#F59E0B", fontSize: "20px" }}>✦</span>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.3rem", fontWeight: 700, color: "#FCD34D",
          }}>Eventura</span>
        </Link>
        <Link to="/plan" style={{
          background: "linear-gradient(135deg, #F59E0B, #D97706)",
          color: "#1C1917", padding: "0.4rem 1.1rem",
          borderRadius: "100px", fontWeight: 500,
          fontSize: "0.82rem", textDecoration: "none",
        }}>+ New Event</Link>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside style={{
          width: "240px", flexShrink: 0,
          background: "#fff",
          borderRight: "1px solid rgba(217,119,6,0.1)",
          padding: "1.5rem 1rem",
          position: "sticky", top: "60px",
          height: "calc(100vh - 60px)",
          overflowY: "auto",
          display: "flex", flexDirection: "column",
        }} className="dashboard-sidebar">

          {/* User pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.85rem 1rem",
            background: "rgba(217,119,6,0.05)",
            borderRadius: "12px", marginBottom: "1.5rem",
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1rem", fontWeight: 700, color: "#1C1917",
              flexShrink: 0,
            }}>{initials}</div>
            <div style={{ overflow: "hidden" }}>
              <div style={{
                fontSize: "0.85rem", fontWeight: 500,
                color: "#1C0A00", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
              }}>{user?.name?.split(" ")[0] || "Customer"}</div>
              <div style={{
                fontSize: "0.72rem", color: "#92400E",
                fontWeight: 300, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
              }}>{user?.email}</div>
            </div>
          </div>

          {/* Nav links */}
          <div style={{ flex: 1 }}>
            <nav>
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    width: "100%", display: "flex",
                    alignItems: "center", gap: "0.75rem",
                    padding: "0.75rem 1rem", marginBottom: "2px",
                    background: activeSection === item.id ? "rgba(217,119,6,0.08)" : "transparent",
                    border: "none", borderRadius: "10px",
                    color: activeSection === item.id ? "#D97706" : "#78350F",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.88rem",
                    fontWeight: activeSection === item.id ? 500 : 400,
                    cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s",
                    borderLeft: activeSection === item.id ? "3px solid #F59E0B" : "3px solid transparent",
                  }}
                  onMouseEnter={e => { if (activeSection !== item.id) e.currentTarget.style.background = "rgba(217,119,6,0.04)"; }}
                  onMouseLeave={e => { if (activeSection !== item.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: "1rem" }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            <div style={{
              paddingTop: "1.5rem",
              borderTop: "1px solid rgba(217,119,6,0.1)",
              marginLeft: "-1rem", marginRight: "-1rem",
              paddingLeft: "1rem", paddingRight: "1rem",
            }}>
              <Link to="/plan" style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.75rem 1rem",
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                borderRadius: "10px", textDecoration: "none",
                color: "#1C1917", fontWeight: 500, fontSize: "0.85rem",
              }}>
                <span>✦</span> Plan New Event
              </Link>
            </div>
          </div>

          {/* Sign Out */}
          <div style={{
            paddingTop: "0.6rem",
            marginLeft: "-1rem", marginRight: "-1rem",
            paddingLeft: "1rem", paddingRight: "1rem",
          }}>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              style={{
                width: "100%", padding: "0.7rem",
                background: "transparent",
                border: "1px solid rgba(217,119,6,0.2)",
                borderRadius: "10px", color: "rgba(120,53,15,0.5)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.82rem", cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(217,119,6,0.06)"; e.currentTarget.style.color = "#78350F"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(120,53,15,0.5)"; }}
            >Sign Out</button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{
          flex: 1, padding: "2rem clamp(1.5rem, 4vw, 3rem)",
          maxWidth: "900px",
          animation: "fadeIn 0.3s ease both",
        }} key={activeSection}>
          {SECTIONS[activeSection]}
        </main>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media(max-width: 768px) {
          .dashboard-sidebar { display: none !important; }
        }
      `}</style>
      <ChatWidget />
    </div>
  );
}
