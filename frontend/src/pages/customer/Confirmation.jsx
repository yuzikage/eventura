import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWizard } from "../../context/WizardContext";
import ChatWidget from '../../components/ChatWidget';
import { useFonts } from "../../hooks/useFonts";

export default function Confirmation() {
  useFonts();
  const navigate = useNavigate();
  const { selections } = useWizard();

  // MeetingScheduler stores the full API booking response here after POST /bookings
  const booking = selections.confirmedBooking;

  // If someone lands here directly (no booking in context), bounce back
  useEffect(() => {
    if (!selections.eventType) navigate("/plan");
  }, []);

  // Use the API's total_estimated_cost if available, else fall back to the
  // client-computed total so the page never shows ₹0
  const guests        = selections.guestCount || 0;
  const venueTotal    = selections.venue?.price           || 0;
  const cateringTotal = (selections.catering?.pricePerHead || selections.catering?.price_per_head || 0) * guests;
  const packageCost   = selections.package?.price          || 0;
  const photoCost     = selections.photography?.price      || 0;
  const themeCost     = 5000;
  const grandTotal    = booking?.total_estimated_cost
    ?? (venueTotal + cateringTotal + packageCost + photoCost + themeCost);

  // Booking reference from API (e.g. "EVT-A3F2K"), or fallback while loading
  const bookingRef = booking?.booking_reference || "EVT-XXXXX";

  const SUMMARY_ROWS = [
    { label: "Event Type",  value: selections.eventType?.label },
    { label: "Venue",       value: selections.venue?.name },
    { label: "Theme",       value: selections.theme?.name },
    { label: "Guests",      value: selections.guestCount ? `${selections.guestCount} guests` : null },
    { label: "Package",     value: selections.package?.label },
    { label: "Photography", value: selections.photography?.label },
    { label: "Catering",    value: selections.catering?.label },
    { label: "Meeting",     value: booking?.meeting_date ? `${booking.meeting_date} at ${booking.meeting_time}` : null },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #1C0A00 0%, #3D1A00 50%, #1A0A00 100%)",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{ height: "60px", display: "flex", alignItems: "center", padding: "0 2rem", justifyContent: "space-between", borderBottom: "1px solid rgba(245,158,11,0.1)" }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#F59E0B", fontSize: "20px" }}>✦</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: "#FCD34D" }}>Eventura</span>
        </Link>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem clamp(1.5rem, 5vw, 3rem)" }}>
        <div style={{ width: "100%", maxWidth: "680px" }}>

          {/* Success icon */}
          <div style={{ textAlign: "center", marginBottom: "2rem", animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #F59E0B, #D97706)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", boxShadow: "0 8px 32px rgba(245,158,11,0.4)" }}>✓</div>
          </div>

          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: "2.5rem", animation: "fadeUp 0.6s 0.2s ease both" }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2.2rem, 5vw, 3.2rem)", fontWeight: 700, color: "#FFFBEB", margin: "0 0 0.6rem", lineHeight: 1.1 }}>
              You're All Set!
            </h1>
            <p style={{ fontSize: "0.95rem", color: "rgba(255,251,235,0.6)", margin: "0 0 1rem", fontWeight: 300, lineHeight: 1.7, maxWidth: "480px", marginInline: "auto" }}>
              Your consultation has been scheduled. Our event manager will reach out to confirm the details and begin bringing your vision to life.
            </p>
            {/* Booking reference */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "100px", padding: "0.4rem 1.2rem" }}>
              <span style={{ fontSize: "0.75rem", color: "rgba(255,251,235,0.45)", letterSpacing: "0.06em" }}>BOOKING REF</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontWeight: 700, color: "#FCD34D", letterSpacing: "0.1em" }}>
                {bookingRef}
              </span>
            </div>
          </div>

          {/* Summary card */}
          <div style={{ background: "rgba(255,251,235,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "20px", overflow: "hidden", marginBottom: "1.5rem", animation: "fadeUp 0.6s 0.35s ease both" }}>
            <div style={{ padding: "1.2rem 1.8rem", borderBottom: "1px solid rgba(245,158,11,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,251,235,0.4)" }}>Booking Summary</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: "#F59E0B" }}>₹{grandTotal.toLocaleString()}</span>
            </div>
            {SUMMARY_ROWS.filter(r => r.value).map((row, i, arr) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1.8rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(245,158,11,0.06)" : "none" }}>
                <span style={{ fontSize: "0.83rem", color: "rgba(255,251,235,0.4)" }}>{row.label}</span>
                <span style={{ fontSize: "0.88rem", fontWeight: 500, color: "rgba(255,251,235,0.85)" }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* What happens next */}
          <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "16px", padding: "1.5rem 1.8rem", marginBottom: "2rem", animation: "fadeUp 0.6s 0.5s ease both" }}>
            <div style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#F59E0B", marginBottom: "1rem" }}>What happens next</div>
            {[
              { icon: "📞", text: "Your event manager will call to confirm the meeting time." },
              { icon: "📋", text: "A detailed proposal will be shared before the consultation." },
              { icon: "✍️", text: "During the meeting, you'll finalise all event details." },
              { icon: "🎉", text: "Once confirmed, your event is officially on the calendar!" },
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start", marginBottom: i < 3 ? "0.85rem" : 0 }}>
                <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "1px" }}>{step.icon}</span>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,251,235,0.65)", fontWeight: 300, lineHeight: 1.6 }}>{step.text}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.6s 0.65s ease both" }}>
            <Link to="/dashboard" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#1C1917", padding: "0.85rem 2rem", borderRadius: "100px", fontWeight: 500, fontSize: "0.95rem", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 6px 20px rgba(245,158,11,0.35)", transition: "all 0.2s", display: "inline-block" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(245,158,11,0.45)"; }} onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 20px rgba(245,158,11,0.35)"; }}>
              Go to My Dashboard
            </Link>
            <Link to="/" style={{ background: "transparent", border: "1px solid rgba(252,211,77,0.3)", color: "#FCD34D", padding: "0.85rem 2rem", borderRadius: "100px", fontWeight: 400, fontSize: "0.95rem", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s", display: "inline-block" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(252,211,77,0.08)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <ChatWidget />
    </div>
  );
}
