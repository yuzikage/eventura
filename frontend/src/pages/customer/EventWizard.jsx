import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useWizard } from "../../context/WizardContext";
import { eventTypesApi, venuesApi, themesApi, packagesApi, aiApi } from "../../services/api";
import ChatWidget from '../../components/ChatWidget';
import { useFonts } from "../../hooks/useFonts";


// Step 2 is the AI recommender — it doesn't appear in the sidebar
// since it's optional and not a data-collection step.
// Steps 3-9 map to the original steps 2-7 + meeting scheduler.
const STEP_NAMES = [
  "Event Type", "Venue", "Theme",
  "Guests", "Package", "Photography", "Catering",
];

// Total user-facing steps excluding the AI step (step 2)
const TOTAL_STEPS = 7;

// Converts internal step number to display step number
// Step 1 = 1, Step 2 (AI) = shown as 1 still, Steps 3-9 = shown as 2-7
function displayStep(step) {
  if (step <= 1) return 1;
  if (step === 2) return 1;   // AI step doesn't count
  return step - 1;            // steps 3-9 → 2-7
}

function StepHeader({ step, title, subtitle }) {
  const shown = displayStep(step);
  const isAiStep = step === 2;
  return (
    <div style={{ marginBottom: "2rem" }}>
      {!isAiStep && (
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.75rem", letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#D97706", fontWeight: 500,
        }}>
          Step {shown} of {TOTAL_STEPS}
        </span>
      )}
      <h2 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
        fontWeight: 700, color: "#1C0A00",
        margin: isAiStep ? "0 0 0.4rem" : "0.3rem 0 0.4rem", lineHeight: 1.1,
      }}>{title}</h2>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.92rem", color: "#78350F",
        margin: 0, fontWeight: 300,
      }}>{subtitle}</p>
    </div>
  );
}

function SelectionCard({ selected, onClick, children, style = {} }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: selected ? "2px solid #F59E0B" : "1.5px solid rgba(217,119,6,0.2)",
        borderRadius: "14px", padding: "1.4rem",
        cursor: "pointer", background: selected ? "#FFFBEB" : "#fff",
        transition: "all 0.2s ease",
        boxShadow: selected ? "0 4px 20px rgba(245,158,11,0.2)" : "0 2px 8px rgba(28,10,0,0.05)",
        position: "relative",
        ...style,
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = "rgba(217,119,6,0.5)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(28,10,0,0.1)"; } }}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = "rgba(217,119,6,0.2)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(28,10,0,0.05)"; } }}
    >
      {selected && (
        <div style={{
          position: "absolute", top: "10px", right: "10px",
          width: "22px", height: "22px", borderRadius: "50%",
          background: "#F59E0B",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", color: "#1C0A00", fontWeight: 700,
        }}>✓</div>
      )}
      {children}
    </div>
  );
}

function NavButtons({ step, onBack, onNext, canNext = true, nextLabel }) {
  const shown = displayStep(step);
  const isAiStep = step === 2;
  const isLast = shown === TOTAL_STEPS;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "center", marginTop: "2.5rem",
      paddingTop: "1.5rem",
      borderTop: "1px solid rgba(217,119,6,0.15)",
    }}>
      <button
        onClick={onBack}
        disabled={step === 1}
        style={{
          padding: "0.75rem 1.8rem",
          border: "1.5px solid rgba(217,119,6,0.3)",
          borderRadius: "100px", background: "transparent",
          color: step === 1 ? "rgba(120,53,15,0.3)" : "#78350F",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.92rem", fontWeight: 500,
          cursor: step === 1 ? "not-allowed" : "pointer",
          transition: "all 0.2s",
        }}
      >
        ← Back
      </button>
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          padding: "0.75rem 2.2rem",
          background: canNext
            ? "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
            : "rgba(245,158,11,0.3)",
          border: "none", borderRadius: "100px",
          color: canNext ? "#1C1917" : "rgba(28,25,23,0.4)",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.92rem", fontWeight: 500,
          cursor: canNext ? "pointer" : "not-allowed",
          boxShadow: canNext ? "0 4px 16px rgba(245,158,11,0.35)" : "none",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { if (canNext) e.currentTarget.style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
      >
        {nextLabel || (isLast ? "See Price Breakdown →" : isAiStep ? "Choose manually →" : "Continue →")}
      </button>
    </div>
  );
}

function StepSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: "80px", borderRadius: "14px",
          background: "rgba(217,119,6,0.08)",
          animation: "pulse 1.4s ease-in-out infinite",
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

function StepError({ message, onRetry }) {
  return (
    <div style={{
      padding: "2rem", textAlign: "center",
      background: "rgba(220,38,38,0.05)",
      border: "1px solid rgba(220,38,38,0.15)",
      borderRadius: "14px",
    }}>
      <p style={{ color: "#DC2626", fontSize: "0.9rem", margin: "0 0 1rem" }}>⚠️ {message}</p>
      <button onClick={onRetry} style={{
        padding: "0.5rem 1.2rem",
        background: "linear-gradient(135deg, #F59E0B, #D97706)",
        border: "none", borderRadius: "100px",
        color: "#1C1917", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer",
      }}>Try again</button>
    </div>
  );
}

// Steps components

/* Step 1 — Event Type */
function StepEventType({ onNext }) {
  const { selections, update } = useWizard();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await eventTypesApi.list();
      setItems(res.event_types);
    } catch {
      setError("Could not load event types.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <StepHeader step={1} title="What's the occasion?" subtitle="Choose the type of event you're planning." />
      {loading ? <StepSkeleton /> : error ? <StepError message={error} onRetry={load} /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
          {items.map((et) => (
            <SelectionCard key={et.id} selected={selections.eventType?.id === et.id} onClick={() => update("eventType", et)}>
              <div style={{ fontSize: "2.4rem", marginBottom: "0.75rem" }}>{et.icon}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: "#1C0A00", marginBottom: "0.3rem" }}>{et.label}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "#78350F", fontWeight: 300 }}>{et.description}</div>
            </SelectionCard>
          ))}
        </div>
      )}
      <NavButtons step={1} onBack={() => {}} onNext={onNext} canNext={!!selections.eventType} />
    </div>
  );
}

// Step 2 — AI Recommender

function StepAIRecommend({ onNext, onBack, onApply }) {
  const { selections } = useWizard();
  const [guestCount,   setGuestCount]   = useState("");
  const [description,  setDescription]  = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [rec,          setRec]          = useState(null);

  // Require at least 20 chars so "nice event" doesn't pass through
  const canSubmit = description.trim().length >= 20
    && guestCount
    && Number(guestCount) >= 1;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setRec(null);
    try {
      const result = await aiApi.recommend({
        event_type:  selections.eventType?.label || "",
        description: description.trim(),
        guest_count: Number(guestCount),
      });
      setRec(result);
    } catch (err) {
      // 400 from the relevance guard comes back as a normal error —
      // show it directly so the customer knows to re-describe their event.
      setError(err.message || "Could not generate a recommendation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!rec) return;
    onApply(rec, Number(guestCount));
  };

  // Warning banner component (reused for both warning types)
  const WarningBanner = ({ message }) => (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "10px",
      background: "rgba(245,158,11,0.08)",
      border: "1.5px solid rgba(245,158,11,0.3)",
      borderRadius: "12px", padding: "0.9rem 1rem",
    }}>
      <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "1px" }}>⚠️</span>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.83rem", color: "#92400E",
        margin: 0, lineHeight: 1.5, fontWeight: 400,
      }}>
        {message}
      </p>
    </div>
  );

  return (
    <div>
      <StepHeader
        step={2}
        title="Let AI plan it for you"
        subtitle={`You've chosen a ${selections.eventType?.label || "event"}. Describe what you have in mind and we'll build a personalised recommendation.`}
      />

      {/* Input form — shown until a result arrives */}
      {!rec && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>

          {/* Guest count */}
          <div>
            <label style={{
              display: "block", fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.82rem", fontWeight: 500, color: "#78350F", marginBottom: "0.5rem",
            }}>
              How many guests?
            </label>
            <input
              type="number"
              min="1"
              value={guestCount}
              onChange={e => setGuestCount(e.target.value)}
              placeholder="e.g. 120"
              style={{
                width: "100%", padding: "0.75rem 1rem",
                border: "1.5px solid rgba(217,119,6,0.3)",
                borderRadius: "10px", fontSize: "1rem",
                fontFamily: "'DM Sans', sans-serif", color: "#1C0A00",
                background: "#fff", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{
              display: "block", fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.82rem", fontWeight: 500, color: "#78350F", marginBottom: "0.5rem",
            }}>
              Describe your event
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={`e.g. "Outdoor ${selections.eventType?.label?.toLowerCase() || "event"} for family and friends, warm colours, budget around ₹2 lakhs, prefer something elegant"`}
              rows={4}
              style={{
                width: "100%", padding: "0.75rem 1rem",
                border: "1.5px solid rgba(217,119,6,0.3)",
                borderRadius: "10px", fontSize: "0.92rem",
                fontFamily: "'DM Sans', sans-serif", color: "#1C0A00",
                background: "#fff", outline: "none", resize: "vertical",
                lineHeight: 1.6, boxSizing: "border-box",
              }}
            />
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem",
              color: "rgba(120,53,15,0.5)", margin: "0.4rem 0 0", fontWeight: 300,
            }}>
              Mention your budget, style preferences, or anything specific you want.
              {description.trim().length > 0 && description.trim().length < 20 && (
                <span style={{ color: "#D97706", marginLeft: "6px" }}>
                  ({20 - description.trim().length} more characters needed)
                </span>
              )}
            </p>
          </div>

          {/* Error from API — including the relevance guard message */}
          {error && (
            <div style={{
              padding: "0.85rem 1rem",
              background: "rgba(220,38,38,0.05)",
              border: "1px solid rgba(220,38,38,0.2)",
              borderRadius: "10px",
            }}>
              <p style={{ color: "#DC2626", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
                ⚠️ {error}
              </p>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            style={{
              padding: "0.85rem 2rem", alignSelf: "flex-start",
              background: canSubmit && !loading
                ? "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                : "rgba(245,158,11,0.3)",
              border: "none", borderRadius: "100px",
              color: canSubmit && !loading ? "#1C1917" : "rgba(28,25,23,0.4)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.92rem", fontWeight: 500,
              cursor: canSubmit && !loading ? "pointer" : "not-allowed",
              boxShadow: canSubmit && !loading ? "0 4px 16px rgba(245,158,11,0.35)" : "none",
              display: "flex", alignItems: "center", gap: "8px",
              transition: "all 0.2s",
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: "16px", height: "16px",
                  border: "2px solid rgba(28,25,23,0.2)",
                  borderTopColor: "#1C1917",
                  borderRadius: "50%", display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }} />
                Building your recommendation…
              </>
            ) : (
              <>✦ Get AI Recommendation</>
            )}
          </button>
        </div>
      )}

      {/* Recommendation result */}
      {rec && (
        <div style={{
          display: "flex", flexDirection: "column", gap: "1rem",
          animation: "stepIn 0.3s ease both",
        }}>

          {/* Warnings — shown above everything else so they can't be missed */}
          {rec.capacity_warning && <WarningBanner message={rec.capacity_warning} />}
          {rec.budget_warning   && <WarningBanner message={rec.budget_warning} />}

          {/* Summary banner */}
          <div style={{
            background: "linear-gradient(135deg, #1C0A00, #2D1200)",
            borderRadius: "14px", padding: "1.2rem 1.5rem",
            border: "1.5px solid rgba(245,158,11,0.2)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem",
            }}>
              <span style={{ color: "#F59E0B" }}>✦</span>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.7rem", fontWeight: 500,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "rgba(245,158,11,0.7)",
              }}>
                AI Recommendation
              </span>
              {/* Show actual total cost in the header */}
              {rec.actual_total && (
                <span style={{
                  marginLeft: "auto",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "0.95rem", fontWeight: 700,
                  color: rec.budget_warning ? "#F59E0B" : "rgba(254,243,199,0.8)",
                }}>
                  Est. ₹{rec.actual_total.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.05rem", fontWeight: 600,
              color: "#FEF3C7", margin: 0, lineHeight: 1.5,
            }}>
              {rec.summary}
            </p>
          </div>

          {/* Recommendation detail cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            {[
              { label: "📍 Venue",        name: rec.venue?.name,          reason: rec.venue?.reason },
              { label: "🎨 Theme",         name: rec.theme?.name,          reason: rec.theme?.reason },
              { label: "🎪 Event Package", name: rec.event_package?.label, reason: rec.event_package?.reason },
              { label: "📷 Photography",   name: rec.photography?.label,   reason: rec.photography?.reason },
              { label: "🍽️ Catering",     name: rec.catering?.label,      reason: rec.catering?.reason },
              { label: "👥 Guests",        name: `${rec.guest_count} guests`, reason: "Based on your input" },
            ].map(item => (
              <div key={item.label} style={{
                background: "#fff",
                border: "1.5px solid rgba(217,119,6,0.15)",
                borderRadius: "12px", padding: "0.9rem 1rem",
              }}>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.7rem", fontWeight: 500,
                  color: "#92400E", marginBottom: "0.25rem",
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.05rem", fontWeight: 700,
                  color: "#1C0A00", marginBottom: "0.2rem",
                }}>
                  {item.name}
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.75rem", color: "rgba(120,53,15,0.6)",
                  fontWeight: 300, lineHeight: 1.4,
                }}>
                  {item.reason}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button
              onClick={handleApply}
              style={{
                flex: 1, padding: "0.85rem",
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                border: "none", borderRadius: "100px",
                color: "#1C1917", fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.92rem", fontWeight: 500, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
            >
              ✓ Use this recommendation
            </button>
            <button
              onClick={() => { setRec(null); setError(null); }}
              style={{
                padding: "0.85rem 1.5rem",
                background: "transparent",
                border: "1.5px solid rgba(217,119,6,0.3)",
                borderRadius: "100px", color: "#78350F",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.92rem", fontWeight: 500,
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav — "Choose manually" always available */}
      <NavButtons
        step={2}
        onBack={onBack}
        onNext={onNext}
        canNext={true}
        nextLabel="Choose manually →"
      />
    </div>
  );
}

/* Step 3 — Venue */
function StepVenue({ onNext, onBack }) {
  const { selections, update } = useWizard();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await venuesApi.listAvailable();
      setItems(res.venues);
    } catch {
      setError("Could not load venues.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <StepHeader step={3} title="Choose your venue" subtitle="All venues shown are available for your selected date." />
      {loading ? <StepSkeleton /> : error ? <StepError message={error} onRetry={load} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {items.map((v) => (
            <SelectionCard key={v.id} selected={selections.venue?.id === v.id} onClick={() => update("venue", v)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", fontWeight: 700, color: "#1C0A00" }}>{v.name}</span>
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "#78350F", fontWeight: 300 }}>📍 {v.location} · Up to {v.capacity} guests</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 700, color: "#D97706" }}>₹{v.price.toLocaleString()}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "#92400E" }}>per booking</div>
              </div>
            </SelectionCard>
          ))}
        </div>
      )}
      <NavButtons step={3} onBack={onBack} onNext={onNext} canNext={!!selections.venue} />
    </div>
  );
}

/* Step 4 — Theme */
function ThemePreviewModal({ theme, onClose, onSelect, isSelected }) {
  const [imgIndex, setImgIndex] = useState(0);
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const prev = (e) => { e.stopPropagation(); setImgLoading(true); setImgIndex(i => (i - 1 + theme.images.length) % theme.images.length); };
  const next = (e) => { e.stopPropagation(); setImgLoading(true); setImgIndex(i => (i + 1) % theme.images.length); };

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,5,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", animation: "modalFadeIn 0.2s ease both", backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "20px", overflow: "hidden", width: "100%", maxWidth: "640px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 100px rgba(0,0,0,0.5)", animation: "modalPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ position: "relative", background: "#000", flexShrink: 0 }}>
          {theme.images?.[imgIndex] && (
            <img src={theme.images[imgIndex]} alt={theme.name} style={{ width: "100%", height: "320px", objectFit: "cover", opacity: imgLoading ? 0.5 : 1, transition: "opacity 0.2s" }} onLoad={() => setImgLoading(false)} />
          )}
          {theme.images?.length > 1 && (
            <>
              <button onClick={prev} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1rem" }}>‹</button>
              <button onClick={next} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "1rem" }}>›</button>
              <div style={{ position: "absolute", bottom: "0.75rem", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "4px" }}>
                {theme.images.map((_, i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: i === imgIndex ? "#F59E0B" : "rgba(255,255,255,0.5)", transition: "all 0.2s" }} />)}
              </div>
            </>
          )}
          <button onClick={onClose} style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "1rem" }}>×</button>
        </div>
        <div style={{ padding: "1.5rem", overflowY: "auto" }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 700, color: "#1C0A00", margin: "0 0 0.5rem" }}>{theme.name}</h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", color: "#78350F", fontWeight: 300, margin: "0 0 1.5rem", lineHeight: 1.6 }}>{theme.description}</p>
          <button onClick={() => { onSelect(theme); onClose(); }} style={{ width: "100%", padding: "0.75rem", background: isSelected ? "rgba(5,150,105,0.1)" : "linear-gradient(135deg, #F59E0B, #D97706)", border: isSelected ? "1.5px solid #10B981" : "none", borderRadius: "100px", color: isSelected ? "#065F46" : "#1C1917", fontFamily: "'DM Sans', sans-serif", fontSize: "0.92rem", fontWeight: 500, cursor: "pointer" }}>
            {isSelected ? "✓ Selected" : "Select this theme"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function StepTheme({ onNext, onBack }) {
  const { selections, update } = useWizard();
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [previewTheme, setPreviewTheme] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await themesApi.listActive();
      setItems(res.themes);
    } catch {
      setError("Could not load themes.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <StepHeader step={4} title="Pick your theme" subtitle="Click any theme to preview it in detail." />
      {loading ? <StepSkeleton /> : error ? <StepError message={error} onRetry={load} /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.2rem" }}>
          {items.map((t) => (
            <div key={t.id} style={{ border: selections.theme?.id === t.id ? "2px solid #F59E0B" : "1.5px solid rgba(217,119,6,0.2)", borderRadius: "14px", overflow: "hidden", transition: "all 0.2s ease", boxShadow: selections.theme?.id === t.id ? "0 4px 20px rgba(245,158,11,0.2)" : "0 2px 8px rgba(28,10,0,0.05)", position: "relative", cursor: "pointer" }} onClick={() => setPreviewTheme(t)}>
              {selections.theme?.id === t.id && (
                <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 2, width: "22px", height: "22px", borderRadius: "50%", background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#1C0A00", fontWeight: 700 }}>✓</div>
              )}
              <div style={{ width: "100%", height: "130px", overflow: "hidden", position: "relative", background: "rgba(217,119,6,0.08)" }}>
                {t.images?.[0] ? (
                  <img src={t.images[0]} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }} onMouseEnter={e => e.target.style.transform = "scale(1.06)"} onMouseLeave={e => e.target.style.transform = "scale(1)"} onError={e => { e.target.style.display = "none"; }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "rgba(217,119,6,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>🎨</div>
                )}
                <div style={{ position: "absolute", bottom: "6px", right: "6px", background: "rgba(15,5,0,0.6)", color: "#fff", fontSize: "0.62rem", padding: "2px 6px", borderRadius: "100px", fontFamily: "'DM Sans', sans-serif" }}>{t.images?.length || 0} photos</div>
              </div>
              <div style={{ padding: "0.9rem 1rem 1rem" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 700, color: "#1C0A00", marginBottom: "0.2rem" }}>{t.name}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "#78350F", fontWeight: 300, marginBottom: "0.85rem", lineHeight: 1.4 }}>{t.description}</div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={e => { e.stopPropagation(); setPreviewTheme(t); }} style={{ flex: 1, padding: "0.45rem 0", background: "transparent", border: "1.5px solid rgba(217,119,6,0.25)", borderRadius: "8px", color: "#D97706", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", cursor: "pointer" }}>Preview</button>
                  <button onClick={e => { e.stopPropagation(); update("theme", t); }} style={{ flex: 1, padding: "0.45rem 0", background: selections.theme?.id === t.id ? "rgba(5,150,105,0.1)" : "linear-gradient(135deg, #F59E0B, #D97706)", border: selections.theme?.id === t.id ? "1.5px solid #10B981" : "none", borderRadius: "8px", color: selections.theme?.id === t.id ? "#065F46" : "#1C1917", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 500, cursor: "pointer" }}>
                    {selections.theme?.id === t.id ? "✓ Chosen" : "Select"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {previewTheme && <ThemePreviewModal theme={previewTheme} onClose={() => setPreviewTheme(null)} onSelect={(t) => update("theme", t)} isSelected={selections.theme?.id === previewTheme.id} />}
      <NavButtons step={4} onBack={onBack} onNext={onNext} canNext={!!selections.theme} />
    </div>
  );
}

/* Steps 5-9 — Guests, Package, Photography, Catering */
function StepGuests({ onNext, onBack }) {
  const { selections, update } = useWizard();
  const maxCapacity = selections.venue?.capacity || 500;
  const [count, setCount] = useState(selections.guestCount || 50);

  const handleChange = (val) => {
    const clamped = Math.min(Math.max(10, val), maxCapacity);
    setCount(clamped);
    update("guestCount", clamped);
  };

  return (
    <div>
      <StepHeader step={5} title="How many guests?" subtitle={`Your venue fits up to ${maxCapacity} guests.`} />
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "5rem", fontWeight: 700, color: "#D97706", lineHeight: 1 }}>{count}</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", color: "#92400E", marginTop: "0.5rem", fontWeight: 300 }}>guests</div>
      </div>
      <div style={{ marginBottom: "1.5rem" }}>
        <input type="range" min={10} max={maxCapacity} step={5} value={count} onChange={e => handleChange(Number(e.target.value))} style={{ width: "100%", accentColor: "#F59E0B", height: "6px", cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "#92400E", marginTop: "0.4rem" }}>
          <span>10</span><span>{maxCapacity}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "center" }}>
        <button onClick={() => handleChange(count - 5)} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1.5px solid rgba(217,119,6,0.3)", background: "transparent", color: "#D97706", fontSize: "1.2rem", cursor: "pointer" }}>−</button>
        <input type="number" value={count} onChange={e => handleChange(Number(e.target.value))} style={{ width: "90px", textAlign: "center", padding: "0.6rem", border: "1.5px solid rgba(217,119,6,0.3)", borderRadius: "10px", fontSize: "1rem", fontFamily: "'DM Sans', sans-serif", color: "#1C0A00", background: "#fff", outline: "none" }} />
        <button onClick={() => handleChange(count + 5)} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1.5px solid rgba(217,119,6,0.3)", background: "transparent", color: "#D97706", fontSize: "1.2rem", cursor: "pointer" }}>+</button>
      </div>
      <NavButtons step={5} onBack={onBack} onNext={onNext} canNext={count >= 10} />
    </div>
  );
}

function StepPackage({ onNext, onBack }) {
  const { selections, update } = useWizard();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const PACKAGE_COLORS = ["#78716C", "#D97706", "#9D174D"];

  const load = async () => {
    setLoading(true); setError(null);
    try { const res = await packagesApi.events.list(); setItems(res.packages); }
    catch { setError("Could not load event packages."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <StepHeader step={6} title="Select a package" subtitle="Choose the level of service for your event." />
      {loading ? <StepSkeleton /> : error ? <StepError message={error} onRetry={load} /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.2rem" }}>
          {items.map((pkg, idx) => (
            <SelectionCard key={pkg.id} selected={selections.package?.id === pkg.id} onClick={() => update("package", pkg)} style={{ position: "relative" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: PACKAGE_COLORS[idx % PACKAGE_COLORS.length], marginBottom: "0.75rem" }} />
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 700, color: "#1C0A00", marginBottom: "0.25rem" }}>{pkg.label}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 700, color: PACKAGE_COLORS[idx % PACKAGE_COLORS.length], marginBottom: "1rem" }}>₹{pkg.price.toLocaleString()}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {(pkg.features || []).map((f) => (
                  <li key={f} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "#78350F", fontWeight: 300, padding: "0.25rem 0", borderBottom: "1px solid rgba(217,119,6,0.08)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "#D97706", fontSize: "0.7rem" }}>✦</span>{f}
                  </li>
                ))}
              </ul>
            </SelectionCard>
          ))}
        </div>
      )}
      <NavButtons step={6} onBack={onBack} onNext={onNext} canNext={!!selections.package} />
    </div>
  );
}

function StepPhotography({ onNext, onBack }) {
  const { selections, update } = useWizard();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { const res = await packagesApi.photography.list(); setItems(res.packages); }
    catch { setError("Could not load photography packages."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <StepHeader step={7} title="Photography package" subtitle="Capture every precious moment of your event." />
      {loading ? <StepSkeleton /> : error ? <StepError message={error} onRetry={load} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {items.map((ph) => (
            <SelectionCard key={ph.id} selected={selections.photography?.id === ph.id} onClick={() => update("photography", ph)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", fontWeight: 700, color: "#1C0A00", marginBottom: "0.5rem" }}>{ph.label}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {(ph.features || []).map((f) => <span key={f} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "#78350F", background: "rgba(217,119,6,0.07)", padding: "0.2rem 0.6rem", borderRadius: "100px" }}>{f}</span>)}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 700, color: "#D97706" }}>₹{ph.price.toLocaleString()}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "#92400E" }}>flat rate</div>
              </div>
            </SelectionCard>
          ))}
        </div>
      )}
      <NavButtons step={7} onBack={onBack} onNext={onNext} canNext={!!selections.photography} />
    </div>
  );
}

function StepCatering({ onNext, onBack }) {
  const { selections, update } = useWizard();
  const guests = selections.guestCount;
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { const res = await packagesApi.catering.list(); setItems(res.packages); }
    catch { setError("Could not load catering packages."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <StepHeader step={8} title="Catering & food" subtitle={`Pricing shown for ${guests} guests.`} />
      {loading ? <StepSkeleton /> : error ? <StepError message={error} onRetry={load} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {items.map((c) => {
            const pricePerHead = c.price_per_head;
            const total = pricePerHead * guests;
            return (
              <SelectionCard key={c.id} selected={selections.catering?.id === c.id} onClick={() => update("catering", { ...c, pricePerHead })} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", fontWeight: 700, color: "#1C0A00", marginBottom: "0.5rem" }}>{c.label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {(c.features || []).map((f) => <span key={f} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "#78350F", background: "rgba(217,119,6,0.07)", padding: "0.2rem 0.6rem", borderRadius: "100px" }}>{f}</span>)}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 700, color: "#D97706" }}>₹{total.toLocaleString()}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "#92400E" }}>₹{pricePerHead}/head × {guests}</div>
                </div>
              </SelectionCard>
            );
          })}
        </div>
      )}
      <NavButtons step={8} onBack={onBack} onNext={onNext} canNext={!!selections.catering} />
    </div>
  );
}

// Progress sidebar component, shows all steps and highlights current step
function ProgressSidebar({ currentStep }) {
  // Map internal step to display step for sidebar highlighting
  // Step 2 (AI) shows as step 1 still active; steps 3-9 → sidebar steps 2-7
  const sidebarStep = currentStep <= 2 ? 1 : currentStep - 1;

  return (
    <div style={{ width: "220px", flexShrink: 0, padding: "2rem 1.5rem", borderRight: "1px solid rgba(217,119,6,0.12)", background: "#FFF8EE" }} className="wizard-sidebar">
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", fontWeight: 700, color: "#1C0A00", marginBottom: "2rem" }}>Your Event</div>
      {STEP_NAMES.map((name, i) => {
        const stepNum = i + 1;
        const done   = sidebarStep > stepNum;
        const active = sidebarStep === stepNum;
        return (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: done ? "#F59E0B" : active ? "#1C0A00" : "transparent", border: done ? "none" : active ? "none" : "1.5px solid rgba(217,119,6,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: done ? "#1C1917" : active ? "#FFFBEB" : "rgba(120,53,15,0.4)", transition: "all 0.3s" }}>
              {done ? "✓" : stepNum}
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", fontWeight: active ? 500 : 300, color: active ? "#1C0A00" : done ? "#D97706" : "rgba(120,53,15,0.5)", transition: "all 0.3s" }}>{name}</span>
          </div>
        );
      })}
    </div>
  );
}

// Main wizard shell component, manages step state and navigation, renders current step and sidebar
function WizardShell() {
  useFonts();
  const navigate = useNavigate();
  const { bulkUpdate } = useWizard();
  const [step, setStep] = useState(1);

  // Internal steps: 1=EventType, 2=AIRecommend, 3=Venue, 4=Theme,
  //                 5=Guests, 6=Package, 7=Photography, 8=Catering
  const INTERNAL_TOTAL = 8;

  const next = () => {
    if (step === INTERNAL_TOTAL) { navigate("/plan/summary"); return; }
    setStep(s => s + 1);
  };
  const back = () => setStep(s => Math.max(1, s - 1));

  // Called when customer accepts AI recommendation
  const handleApplyRecommendation = (rec, guestCount) => {
    bulkUpdate({
      venue:       rec.venue.full,
      theme:       rec.theme.full,
      guestCount:  guestCount,
      package:     rec.event_package.full,
      photography: rec.photography.full,
      catering:    rec.catering.full,
    });
    navigate("/plan/summary");
  };

  // Progress bar based on display step
  const displayStepNum = displayStep(step);
  const progressPct    = (displayStepNum / TOTAL_STEPS) * 100;

  const STEPS = [
    <StepEventType onNext={next} />,
    <StepAIRecommend onNext={next} onBack={back} onApply={handleApplyRecommendation} />,
    <StepVenue onNext={next} onBack={back} />,
    <StepTheme onNext={next} onBack={back} />,
    <StepGuests onNext={next} onBack={back} />,
    <StepPackage onNext={next} onBack={back} />,
    <StepPhotography onNext={next} onBack={back} />,
    <StepCatering onNext={next} onBack={back} />,
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FFFBEB", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ height: "60px", background: "#1C0A00", display: "flex", alignItems: "center", padding: "0 2rem", justifyContent: "space-between", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
        <Link to={"/"} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#F59E0B", fontSize: "20px" }}>✦</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: "#FCD34D" }}>Eventura</span>
        </Link>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(255,251,235,0.5)" }}>
          {step === 2 ? "AI Recommendation" : `Step ${displayStepNum} of ${TOTAL_STEPS}`}
        </span>
        <button onClick={() => navigate("/dashboard")} style={{ background: "transparent", border: "1px solid rgba(249, 160, 8, 0.25)", color: "#F59E0B", borderRadius: "100px", padding: "0.35rem 1rem", fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>← Back to Dashboard</button>
      </div>

      <div style={{ height: "3px", background: "rgba(217,119,6,0.1)" }}>
        <div style={{ height: "100%", background: "linear-gradient(to right, #F59E0B, #D97706)", width: `${progressPct}%`, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 63px)" }}>
        <ProgressSidebar currentStep={step} />
        <div style={{ flex: 1, padding: "2.5rem clamp(1.5rem, 5vw, 4rem)", maxWidth: "800px", animation: "stepIn 0.3s ease both" }}>
          {STEPS[step - 1]}
        </div>
      </div>

      <style>{`
        @keyframes stepIn    { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalPopIn  { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @media(max-width: 768px) { .wizard-sidebar { display: none !important; } }
      `}</style>
      <ChatWidget />
    </div>
  );
}

export default function EventWizard() {
  return <WizardShell />;
}
