import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { bookingsApi } from "../../services/api";
import { fmtCurrency, fmtApiDate } from "../../utils/formatters";
import { useFonts } from "../../hooks/useFonts";

const C = {
  bg: "#F5F3FF", dark: "#1E1B4B", mid: "#4338CA",
  accent: "#6366F1", accentLt: "rgba(99,102,241,0.1)",
  border: "rgba(99,102,241,0.12)", muted: "rgba(67,56,202,0.45)",
  amber: "#F59E0B",
};

const STATUS_META = {
  confirmed: { label: "Confirmed",      bg: "rgba(5,150,105,0.1)",  color: "#065F46", dot: "#10B981" },
  pending:   { label: "Pending Review", bg: "rgba(245,158,11,0.1)", color: "#92400E", dot: "#F59E0B" },
  cancelled: { label: "Cancelled",      bg: "rgba(220,38,38,0.1)",  color: "#991B1B", dot: "#EF4444" },
};


function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: m.bg, color: m.color, padding: "0.3rem 0.8rem", borderRadius: "100px", fontSize: "0.78rem", fontWeight: 500 }}>
      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: m.dot }} />
      {m.label}
    </span>
  );
}

function InfoCard({ title, children }) {
  return (
    <div style={{ background: "#fff", border: `1.5px solid rgba(99,102,241,0.12)`, borderRadius: "14px", padding: "1.2rem 1.5rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 500, color: "rgba(67,56,202,0.45)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.9rem" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: sub ? "flex-start" : "center", padding: "0.55rem 0", borderBottom: `1px solid rgba(99,102,241,0.07)` }}>
      <span style={{ fontSize: "0.8rem", color: "rgba(67,56,202,0.5)", fontWeight: 300 }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "#1E1B4B" }}>{value || "—"}</div>
        {sub && <div style={{ fontSize: "0.72rem", color: "rgba(67,56,202,0.4)", fontWeight: 300 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ height: "200px", borderRadius: "14px", background: C.accentLt, animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i*0.1}s` }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// AI Review Card

function ReviewShimmer() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {["80%", "60%", "90%", "50%"].map((w, i) => (
        <div key={i} style={{
          height: "12px", width: w, borderRadius: "6px",
          background: "linear-gradient(90deg, rgba(99,102,241,0.08) 25%, rgba(99,102,241,0.18) 50%, rgba(99,102,241,0.08) 75%)",
          backgroundSize: "200% 100%",
          animation: `shimmer 1.6s ease-in-out infinite`,
          animationDelay: `${i * 0.15}s`,
        }} />
      ))}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

function AIReviewCard({ bookingId, refreshKey }) {
  const [review,      setReview]      = useState(null);
  const [loadingAI,   setLoadingAI]   = useState(true);
  const [reviewError, setReviewError] = useState(false);
  
  useEffect(() => {

    let cancelled = false;

    const load = async () => {
      setLoadingAI(true);
      setReviewError(false);
      setReview(null);
      try {
        const data = await bookingsApi.getReview(bookingId);
        if (!cancelled) setReview(data);
      } catch {
        if (!cancelled) setReviewError(true);
      } finally {
        if (!cancelled) setLoadingAI(false);
      }
    };
    load();

    return () => { cancelled = true; };
  }, [bookingId, refreshKey]);

  const hasFlags = review?.flags?.length > 0;

  return (
    <div style={{
      background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
      border: "1.5px solid rgba(99,102,241,0.3)",
      borderRadius: "14px",
      padding: "1.4rem 1.6rem",
      position: "relative",
      overflow: "hidden",
      marginBottom: "2rem",
    }}>
      {/* Subtle decorative glow */}
      <div style={{
        position: "absolute", top: "-40px", right: "-40px",
        width: "160px", height: "160px",
        background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
        <span style={{ fontSize: "1rem" }}>✦</span>
        <span style={{
          fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "rgba(165,180,252,0.7)",
        }}>
          AI Manager Assistant
        </span>
        {loadingAI && (
          <span style={{
            marginLeft: "auto", fontSize: "0.7rem", color: "rgba(165,180,252,0.5)",
            fontStyle: "italic",
          }}>
            Analysing booking…
          </span>
        )}
      </div>

      {/* Content */}
      {loadingAI ? (
        <ReviewShimmer />
      ) : reviewError ? (
        <p style={{ fontSize: "0.83rem", color: "rgba(252,211,77,0.7)", margin: 0 }}>
          AI review unavailable. Please review the booking manually.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Summary */}
          <p style={{
            margin: 0,
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.05rem", fontWeight: 600,
            color: "#E0E7FF", lineHeight: 1.45,
          }}>
            {review.summary}
          </p>

          {/* Flags */}
          {hasFlags && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 500, color: "rgba(252,211,77,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Flags
              </span>
              {review.flags.map((flag, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: "8px",
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: "8px", padding: "0.5rem 0.75rem",
                }}>
                  <span style={{ color: "#F59E0B", fontSize: "0.75rem", marginTop: "1px", flexShrink: 0 }}>⚠</span>
                  <span style={{ fontSize: "0.82rem", color: "rgba(253,230,138,0.9)", lineHeight: 1.4 }}>{flag}</span>
                </div>
              ))}
            </div>
          )}

          {/* Suggestion */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "8px",
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "8px", padding: "0.55rem 0.75rem",
          }}>
            <span style={{ color: "#818CF8", fontSize: "0.75rem", marginTop: "1px", flexShrink: 0 }}>→</span>
            <span style={{ fontSize: "0.82rem", color: "rgba(199,210,254,0.9)", lineHeight: 1.4 }}>
              {review.suggestion}
            </span>
          </div>

        </div>
      )}
    </div>
  );
}

// Main component

export default function BookingDetail() {
  useFonts();
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking,   setBooking]   = useState(null);
  const [savedStatus,  setSavedStatus]  = useState(null);
  const [draftStatus,  setDraftStatus]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [reviewKey, setReviewKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await bookingsApi.get(id);
        setBooking(data);
        setSavedStatus(data.status);
        setDraftStatus(data.status);
      } catch (err) {
        if (err.status === 404 || err.status === 403) setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (!draftStatus) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await bookingsApi.updateStatus(id, draftStatus);
      setBooking(updated);
      setSavedStatus(updated.status);
      setDraftStatus(updated.status);
      setReviewKey(k => k + 1);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.message || "Failed to update status. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!loading && notFound) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", color: C.dark }}>Booking not found</h2>
        <p style={{ color: C.muted, fontSize: "0.88rem" }}>This booking may not exist or you don't have access to it.</p>
        <button onClick={() => navigate("/manager")} style={{ marginTop: "1rem", padding: "0.7rem 1.5rem", background: C.accent, color: "#fff", border: "none", borderRadius: "100px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );

  const user        = booking?.user;
  const venue       = booking?.venue;
  const theme       = booking?.theme;
  const eventType   = booking?.event_type;
  const eventPkg    = booking?.event_package;
  const photoPkg    = booking?.photography_package;
  const cateringPkg = booking?.catering_package;

  const venuePrice      = venue?.price               || 0;
  const cateringPerHead = cateringPkg?.price_per_head || 0;
  const guests          = booking?.guest_count        || 0;
  const cateringTotal   = cateringPerHead * guests;
  const packageCost     = eventPkg?.price             || 0;
  const photoCost       = photoPkg?.price             || 0;
  const themeCost       = 5000;
  const grandTotal      = booking?.total_estimated_cost
    || (venuePrice + cateringTotal + packageCost + photoCost + themeCost);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Topbar */}
      <div style={{ height: "60px", background: C.dark, display: "flex", alignItems: "center", padding: "0 2rem", justifyContent: "space-between", borderBottom: "1px solid rgba(99,102,241,0.2)", position: "sticky", top: 0, zIndex: 50 }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: C.amber, fontSize: "20px" }}>✦</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: "#FCD34D" }}>Eventura</span>
        </Link>
        <button onClick={() => navigate("/manager")} style={{ background: "transparent", border: "1px solid rgba(99,102,241,0.3)", color: "rgba(165,180,252,0.7)", borderRadius: "100px", padding: "0.35rem 1rem", fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem clamp(1.5rem, 5vw, 3rem)" }}>
        {loading ? <Skeleton /> : (
          <>
            {/* Page header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent, fontWeight: 500 }}>Booking Detail</span>
                <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 700, color: C.dark, margin: "0.3rem 0 0.3rem", lineHeight: 1.1 }}>
                  {user?.name || "Customer"}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.82rem", color: C.muted, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>#{booking?.booking_reference}</span>
                  <StatusBadge status={savedStatus} />
                </div>
              </div>

              {/* Status updater */}
              <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "14px", padding: "1rem 1.2rem", minWidth: "220px" }}>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, color: C.muted, marginBottom: "0.5rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Update Status
                </label>
                <select value={draftStatus || ""} onChange={e => setDraftStatus(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.8rem", border: `1.5px solid ${C.border}`, borderRadius: "8px", fontSize: "0.88rem", fontFamily: "'DM Sans', sans-serif", color: C.dark, background: "#FAFAFA", outline: "none", marginBottom: "0.75rem", cursor: "pointer" }}>
                  <option value="pending">Pending Review</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {saveError && (
                  <p style={{ fontSize: "0.75rem", color: "#DC2626", margin: "0 0 0.5rem" }}>⚠️ {saveError}</p>
                )}

                <button onClick={handleSave} disabled={saving || draftStatus === savedStatus} style={{ width: "100%", padding: "0.6rem", background: saved ? "rgba(5,150,105,0.15)" : saving ? "rgba(99,102,241,0.4)" : draftStatus === savedStatus ? "rgba(99,102,241,0.2)" : `linear-gradient(135deg, ${C.accent}, ${C.mid})`, border: saved ? "1px solid #10B981" : "none", color: saved ? "#065F46" : draftStatus === savedStatus ? C.muted : "#fff", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 500, fontFamily: "'DM Sans', sans-serif", cursor: saving || draftStatus === savedStatus ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  {saving ? (
                    <><span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Saving...</>
                  ) : saved ? "✓ Saved" : "Save Changes"}
                </button>
              </div>
            </div>

            {/* AI Review — full width, loads automatically */}
            {booking && savedStatus && (
              <AIReviewCard bookingId={booking?.id} refreshKey={reviewKey} />
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="detail-grid">

              {/* Customer info */}
              <InfoCard title="Customer Details">
                {[
                  { label: "Name",  value: user?.name },
                  { label: "Phone", value: user?.phone },
                  { label: "Email", value: user?.email },
                ].map(r => <InfoRow key={r.label} {...r} />)}
              </InfoCard>

              {/* Consultation */}
              <InfoCard title="Consultation">
                {[
                  { label: "Event Date",    value: fmtApiDate(booking?.event_date) },
                  { label: "Meeting Date",  value: fmtApiDate(booking?.meeting_date) },
                  { label: "Meeting Time",  value: booking?.meeting_time },
                  { label: "Meeting Notes", value: booking?.meeting_notes || "None" },
                ].map(r => <InfoRow key={r.label} {...r} />)}
              </InfoCard>

              {/* Event Details */}
              <InfoCard title="Event Details">
                {[
                  { label: "Event Type",    value: eventType ? `${eventType.icon || ""} ${eventType.label}`.trim() : booking?.event_type_id },
                  { label: "Venue",         value: venue?.name },
                  { label: "Theme",         value: theme?.name },
                  { label: "Guests",        value: guests ? `${guests} guests` : null },
                  { label: "Event Package", value: eventPkg?.label },
                  { label: "Photography",   value: photoPkg?.label },
                  { label: "Catering",      value: cateringPkg?.label },
                ].map(r => <InfoRow key={r.label} {...r} />)}
              </InfoCard>

              {/* Cost breakdown */}
              <InfoCard title="Cost Breakdown">
                {[
                  { label: "Venue",         value: fmtCurrency(venuePrice),    sub: "Flat rate" },
                  { label: "Catering",      value: fmtCurrency(cateringTotal), sub: cateringPerHead ? `₹${cateringPerHead}/head × ${guests}` : null },
                  { label: "Event Package", value: fmtCurrency(packageCost) },
                  { label: "Photography",   value: fmtCurrency(photoCost) },
                  { label: "Theme Setup",   value: fmtCurrency(themeCost) },
                ].map(r => <InfoRow key={r.label} {...r} />)}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", marginTop: "0.25rem", borderTop: `2px solid ${C.border}` }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 500, color: C.dark }}>Grand Total</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: C.mid }}>
                    {fmtCurrency(grandTotal)}
                  </span>
                </div>
              </InfoCard>

            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media(max-width: 680px) { .detail-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
