import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWizard } from "../../context/WizardContext";
import { bookingsApi } from "../../services/api";
import ChatWidget from '../../components/ChatWidget';
import { useFonts } from "../../hooks/useFonts";

const TIME_SLOTS = [
  "10:00 AM", "11:00 AM", "12:00 PM",
  "2:00 PM",  "3:00 PM",  "4:00 PM",  "5:00 PM",
];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toISODate(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dy}`;
}

// Reusable mini calendar component used for both event date and consultation date selection.
function MiniCalendar({ selected, onSelect, accentColor = "#F59E0B" }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth    = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const isPast = (day) => {
    const d = new Date(viewYear, viewMonth, day); d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d < t;
  };
  const isSelected = (day) => selected && selected.getDate() === day && selected.getMonth() === viewMonth && selected.getFullYear() === viewYear;
  const isToday    = (day) => today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: accentColor, fontSize: "1.1rem", padding: "4px 8px", borderRadius: "6px" }}>‹</button>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 700, color: "#1C0A00" }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: accentColor, fontSize: "1.1rem", padding: "4px 8px", borderRadius: "6px" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 500, color: "rgba(120,53,15,0.45)", padding: "4px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const past      = isPast(day);
          const selected_ = isSelected(day);
          const today_    = isToday(day);
          return (
            <button key={day} disabled={past} onClick={() => onSelect(new Date(viewYear, viewMonth, day))} style={{ width: "100%", aspectRatio: "1", border: "none", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", fontWeight: selected_ ? 500 : 400, cursor: past ? "not-allowed" : "pointer", background: selected_ ? accentColor : today_ ? `${accentColor}22` : "transparent", color: selected_ ? "#1C1917" : past ? "rgba(120,53,15,0.2)" : "#3D1A00", transition: "all 0.15s", outline: today_ && !selected_ ? `1.5px solid ${accentColor}66` : "none" }}
              onMouseEnter={e => { if (!past && !selected_) e.currentTarget.style.background = `${accentColor}18`; }}
              onMouseLeave={e => { if (!past && !selected_) e.currentTarget.style.background = "transparent"; }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MeetingScheduler() {
  useFonts();
  const navigate = useNavigate();
  const { selections, setMeeting, update } = useWizard();

  const [eventDate,    setEventDate]    = useState(selections.eventDate    || null);
  const [selectedDate, setSelectedDate] = useState(selections.meetingDate  || null);
  const [selectedTime, setSelectedTime] = useState(selections.meetingTime  || null);
  const [notes,        setNotes]        = useState(selections.meetingNotes || "");
  const [isLoading,    setIsLoading]    = useState(false);
  const [apiError,     setApiError]     = useState(null);
  const [takenSlots,   setTakenSlots]   = useState([]); // slots already booked for selected venue+date

  useEffect(() => { if (!selections.eventType) navigate("/plan"); }, []);

  // Fetch taken time slots whenever the consultation date changes.
  // This lets us disable slots that are already booked at this venue on that day.
  useEffect(() => {
    const venueId = selections.venue?.id;
    if (!venueId || !selectedDate) { setTakenSlots([]); return; }
    const fetchSlots = async () => {
      try {
        const y  = selectedDate.getFullYear();
        const m  = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const d  = String(selectedDate.getDate()).padStart(2, "0");
        const res = await bookingsApi.slots(venueId, `${y}-${m}-${d}`);
        setTakenSlots(res.taken_slots || []);
      } catch {
        setTakenSlots([]); // fail silently — don't block booking on a slot-fetch error
      }
    };
    fetchSlots();
  }, [selectedDate, selections.venue?.id]);

  // All three required: event date, consultation date, and consultation time
  const canSubmit = eventDate && selectedDate && selectedTime;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setApiError(null);

    setMeeting({ eventDate, date: selectedDate, time: selectedTime, notes });

    const guests         = selections.guestCount || 0;
    const venueTotal     = selections.venue?.price || 0;
    const cateringTotal  = (selections.catering?.pricePerHead || selections.catering?.price_per_head || 0) * guests;
    const packageCost    = selections.package?.price     || 0;
    const photoCost      = selections.photography?.price || 0;
    const themeCost      = 5000;
    const totalEstimated = venueTotal + cateringTotal + packageCost + photoCost + themeCost;

    const payload = {
      event_type_id:          selections.eventType?.id,
      venue_id:               selections.venue?.id,
      theme_id:               selections.theme?.id,
      guest_count:            guests,
      event_package_id:       selections.package?.id,
      photography_package_id: selections.photography?.id,
      catering_package_id:    selections.catering?.id,
      event_date:             toISODate(eventDate),
      meeting_date:           toISODate(selectedDate),
      meeting_time:           selectedTime,
      meeting_notes:          notes,
      total_estimated_cost:   totalEstimated,
    };

    try {
      const booking = await bookingsApi.create(payload);
      update("confirmedBooking", booking);
      navigate("/plan/confirmation");
    } catch (err) {
      if (err.status === 409) {
        setApiError("This venue is already booked for an event on that date. Please choose a different date for your event.");
      } else if (err.status === 400 && err.messages) {
        const msgs = Object.values(err.messages).flat().join(" · ");
        setApiError(msgs);
      } else {
        setApiError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d) => d
    ? d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#FFFBEB", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top bar */}
      <div style={{ height: "60px", background: "#1C0A00", display: "flex", alignItems: "center", padding: "0 2rem", justifyContent: "space-between", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#F59E0B", fontSize: "20px" }}>✦</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: "#FCD34D" }}>Eventura</span>
        </Link>
        <button onClick={() => navigate("/plan/summary")} style={{ background: "transparent", border: "1px solid rgba(245,158,11,0.3)", color: "rgba(255,251,235,0.6)", borderRadius: "100px", padding: "0.35rem 1rem", fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>← Back to Summary</button>
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "3rem clamp(1.5rem, 5vw, 3rem)" }}>
        {/* Page header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <span style={{ fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#D97706", fontWeight: 500 }}>Final step</span>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, color: "#1C0A00", margin: "0.3rem 0 0.4rem", lineHeight: 1.1 }}>
            Schedule Your Event & Consultation
          </h1>
          <p style={{ fontSize: "0.92rem", color: "#78350F", margin: 0, fontWeight: 300 }}>
            Pick your event date, then choose a time to meet with your manager before the event.
          </p>
        </div>

        {/* API error banner */}
        {apiError && (
          <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: "12px", padding: "0.9rem 1.2rem", marginBottom: "1.5rem", fontSize: "0.88rem", color: "#DC2626" }}>
            ⚠️ {apiError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }} className="scheduler-grid">

          {/* Left: Event date + Meeting date + Time slots */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* 1. Event date */}
            <div style={{ background: "#fff", border: "2px solid rgba(245,158,11,0.3)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(28,10,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "1.1rem" }}>🎉</span>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1C0A00", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Event Date
                </div>
                <span style={{ marginLeft: "auto", fontSize: "0.68rem", background: "rgba(245,158,11,0.12)", color: "#D97706", padding: "0.15rem 0.5rem", borderRadius: "100px", fontWeight: 500 }}>Required</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#92400E", margin: "0 0 1rem", fontWeight: 300, lineHeight: 1.5 }}>
                The day your event will actually take place at the venue.
              </p>
              <MiniCalendar selected={eventDate} onSelect={setEventDate} accentColor="#F59E0B" />
              {eventDate && (
                <div style={{ marginTop: "0.85rem", padding: "0.6rem 0.9rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "8px", fontSize: "0.82rem", color: "#92400E", fontWeight: 500 }}>
                  🎉 {formatDate(eventDate)}
                </div>
              )}
            </div>

            {/* 2. Consultation date */}
            <div style={{ background: "#fff", border: "1.5px solid rgba(217,119,6,0.18)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(28,10,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "1.1rem" }}>🤝</span>
                <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "#3D1A00", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Consultation Date
                </div>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#92400E", margin: "0 0 1rem", fontWeight: 300, lineHeight: 1.5 }}>
                When would you like to meet with your event manager to discuss the details?
              </p>
              <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} accentColor="#D97706" />
              {selectedDate && (
                <div style={{ marginTop: "0.85rem", padding: "0.6rem 0.9rem", background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.15)", borderRadius: "8px", fontSize: "0.82rem", color: "#92400E", fontWeight: 500 }}>
                  🤝 {formatDate(selectedDate)}
                </div>
              )}
            </div>

            {/* 3. Time slots */}
            <div style={{ background: "#fff", border: "1.5px solid rgba(217,119,6,0.18)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(28,10,0,0.05)" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "#3D1A00", marginBottom: "1rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Consultation Time Slot
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.5rem" }}>
                {TIME_SLOTS.map((slot) => (
                  (() => {
                    const isTaken    = takenSlots.includes(slot);
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        disabled={isTaken}
                        onClick={() => !isTaken && setSelectedTime(slot)}
                        title={isTaken ? "This time slot is already booked" : ""}
                        style={{
                          padding: "0.6rem 0.5rem",
                          border: isSelected
                            ? "2px solid #F59E0B"
                            : isTaken
                            ? "1.5px solid rgba(217,119,6,0.1)"
                            : "1.5px solid rgba(217,119,6,0.2)",
                          borderRadius: "8px",
                          background: isSelected
                            ? "#FFFBEB"
                            : isTaken
                            ? "rgba(217,119,6,0.04)"
                            : "#fff",
                          color: isSelected
                            ? "#D97706"
                            : isTaken
                            ? "rgba(120,53,15,0.25)"
                            : "#3D1A00",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.85rem",
                          fontWeight: isSelected ? 500 : 400,
                          cursor: isTaken ? "not-allowed" : "pointer",
                          transition: "all 0.15s",
                          boxShadow: isSelected ? "0 2px 10px rgba(245,158,11,0.2)" : "none",
                          textDecoration: isTaken ? "line-through" : "none",
                          position: "relative",
                        }}
                        onMouseEnter={e => { if (!isTaken && !isSelected) e.currentTarget.style.borderColor = "rgba(217,119,6,0.4)"; }}
                        onMouseLeave={e => { if (!isTaken && !isSelected) e.currentTarget.style.borderColor = "rgba(217,119,6,0.2)"; }}
                      >
                        {slot}
                        {isTaken && (
                          <span style={{ display: "block", fontSize: "0.55rem", color: "rgba(120,53,15,0.35)", marginTop: "1px", textDecoration: "none" }}>Booked</span>
                        )}
                      </button>
                    );
                  })()
                ))}
              </div>
            </div>
          </div>

          {/* Right: Notes + Summary card + Submit */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Notes */}
            <div style={{ background: "#fff", border: "1.5px solid rgba(217,119,6,0.18)", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(28,10,0,0.05)" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "#3D1A00", marginBottom: "0.75rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Notes for your manager
                <span style={{ color: "rgba(120,53,15,0.4)", fontWeight: 300, marginLeft: "0.4rem", textTransform: "none", letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific requests, questions or details you'd like to share before the meeting..." rows={4} style={{ width: "100%", padding: "0.85rem", border: "1.5px solid rgba(217,119,6,0.2)", borderRadius: "10px", resize: "vertical", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", color: "#1C0A00", lineHeight: 1.6, outline: "none", background: "#FFFBEB", boxSizing: "border-box", transition: "border 0.2s" }}
                onFocus={e => e.target.style.border = "1.5px solid #F59E0B"}
                onBlur={e => e.target.style.border = "1.5px solid rgba(217,119,6,0.2)"}
              />
            </div>

            {/* Summary card */}
            <div style={{ background: "linear-gradient(160deg, #1C0A00, #3D1A00)", borderRadius: "16px", padding: "1.8rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,251,235,0.4)", marginBottom: "1.2rem" }}>Booking Summary</div>

              {[
                { icon: "🎉", label: "Event",   val: selections.eventType?.label },
                { icon: "🏛",  label: "Venue",   val: selections.venue?.name },
                { icon: "🎨", label: "Theme",   val: selections.theme?.name },
                { icon: "👥", label: "Guests",  val: selections.guestCount ? `${selections.guestCount} guests` : null },
                { icon: "📦", label: "Package", val: selections.package?.label },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,251,235,0.06)" }}>
                  <span style={{ fontSize: "0.82rem", color: "rgba(255,251,235,0.4)", display: "flex", alignItems: "center", gap: "0.4rem" }}>{row.icon} {row.label}</span>
                  <span style={{ fontSize: "0.85rem", color: "#FCD34D", fontWeight: 500 }}>{row.val || "—"}</span>
                </div>
              ))}

              {/* Event date pill */}
              <div style={{ marginTop: "1.2rem", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "10px", padding: "0.9rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: eventDate ? "0.5rem" : 0 }}>
                  <span style={{ fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,251,235,0.35)" }}>Event Date</span>
                  {eventDate ? (
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.9rem", fontWeight: 600, color: "#FCD34D" }}>{formatDate(eventDate)}</span>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "rgba(255,251,235,0.25)", fontStyle: "italic" }}>Not set</span>
                  )}
                </div>
                {eventDate && selectedDate && selectedTime && (
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,251,235,0.08)" }}>
                    <span style={{ fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,251,235,0.35)" }}>Consultation</span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.88rem", fontWeight: 600, color: "#FCD34D" }}>{formatDate(selectedDate)}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,251,235,0.5)" }}>at {selectedTime}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} disabled={!canSubmit || isLoading} style={{ width: "100%", marginTop: "1.2rem", padding: "0.9rem", background: canSubmit && !isLoading ? "linear-gradient(135deg, #F59E0B, #D97706)" : "rgba(245,158,11,0.25)", border: "none", borderRadius: "10px", color: canSubmit && !isLoading ? "#1C1917" : "rgba(28,25,23,0.4)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.95rem", fontWeight: 500, cursor: canSubmit && !isLoading ? "pointer" : "not-allowed", boxShadow: canSubmit ? "0 6px 20px rgba(245,158,11,0.3)" : "none", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                onMouseEnter={e => { if (canSubmit && !isLoading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(245,158,11,0.45)"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = canSubmit ? "0 6px 20px rgba(245,158,11,0.3)" : "none"; }}
              >
                {isLoading ? (
                  <>
                    <span style={{ width: "16px", height: "16px", border: "2px solid rgba(28,25,23,0.3)", borderTopColor: "#1C1917", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    Confirming...
                  </>
                ) : "Confirm Booking →"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media(max-width: 768px) { .scheduler-grid { grid-template-columns: 1fr !important; } }
      `}</style>
      <ChatWidget />
    </div>
  );
}
