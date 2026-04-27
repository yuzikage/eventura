import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useWizard } from "../../context/WizardContext";
import ChatWidget from '../../components/ChatWidget'
import { useFonts } from "../../hooks/useFonts";

export default function PriceBreakdown() {
  useFonts();
  const navigate = useNavigate();
  const { selections, update } = useWizard();
  const [guests, setGuests] = useState(selections.guestCount || 50);

  /* redirect back if wizard wasn't completed */
  useEffect(() => {
    if (!selections.eventType) navigate("/plan");
  }, []);

  const venueTotal    = selections.venue?.price   || 0;
  const cateringTotal = (selections.catering?.pricePerHead || 0) * guests;
  const packageCost   = selections.package?.price          || 0;
  const photoCost     = selections.photography?.price      || 0;
  const themeCost     = 1000;
  const grandTotal    = venueTotal + cateringTotal + packageCost + photoCost + themeCost;

  const handleGuestChange = (val) => {
    const max = selections.venue?.capacity || 500;
    const clamped = Math.min(Math.max(10, val), max);
    setGuests(clamped);
    update("guestCount", clamped);
  };

  const LINE_ITEMS = [
    {
      label: "Venue",
      sublabel: selections.venue?.name || "—",
      detail: `Flat rate`,
      amount: venueTotal,
      icon: "🏛️",
    },
    {
      label: "Theme Setup",
      sublabel: selections.theme?.name || "—",
      detail: "Flat rate",
      amount: themeCost,
      icon: "🎨",
    },
    {
      label: "Event Package",
      sublabel: selections.package?.label || "—",
      detail: "Flat rate",
      amount: packageCost,
      icon: "📦",
    },
    {
      label: "Photography",
      sublabel: selections.photography?.label || "—",
      detail: "Flat rate",
      amount: photoCost,
      icon: "📷",
    },
    {
      label: "Catering",
      sublabel: selections.catering?.label || "—",
      detail: `₹${selections.catering?.pricePerHead || 0}/head × ${guests}`,
      amount: cateringTotal,
      icon: "🍽️",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#FFFBEB",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Top bar */}
      <div style={{
        height: "60px", background: "#1C0A00",
        display: "flex", alignItems: "center",
        padding: "0 2rem", justifyContent: "space-between",
        borderBottom: "1px solid rgba(245,158,11,0.15)",
      }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#F59E0B", fontSize: "20px" }}>✦</span>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.3rem", fontWeight: 700, color: "#FCD34D",
          }}>Eventura</span>
        </Link>
        <button
          onClick={() => navigate("/plan")}
          style={{
            background: "transparent", border: "1px solid rgba(245,158,11,0.3)",
            color: "rgba(255,251,235,0.6)", borderRadius: "100px",
            padding: "0.35rem 1rem", fontSize: "0.8rem",
            fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
          }}
        >
          ← Edit Selections
        </button>
      </div>

      <div style={{
        maxWidth: "860px", margin: "0 auto",
        padding: "3rem clamp(1.5rem, 5vw, 3rem)",
      }}>
        {/* Page header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <span style={{
            fontSize: "0.75rem", letterSpacing: "0.14em",
            textTransform: "uppercase", color: "#D97706", fontWeight: 500,
          }}>Almost there</span>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 700, color: "#1C0A00",
            margin: "0.3rem 0 0.4rem", lineHeight: 1.1,
          }}>Your Price Breakdown</h1>
          <p style={{
            fontSize: "0.92rem", color: "#78350F",
            margin: 0, fontWeight: 300,
          }}>
            Review your selections and adjust guest count if needed.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "start" }}
          className="breakdown-grid">

          {/* Left: Line items */}
          <div>
            {/* Event summary pill */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: "0.5rem",
              marginBottom: "1.5rem",
            }}>
              {[
                selections.eventType?.label,
                selections.venue?.location,
                `${guests} guests`,
              ].filter(Boolean).map((tag) => (
                <span key={tag} style={{
                  background: "rgba(217,119,6,0.1)",
                  border: "1px solid rgba(217,119,6,0.2)",
                  color: "#92400E", borderRadius: "100px",
                  padding: "0.25rem 0.75rem",
                  fontSize: "0.8rem", fontWeight: 400,
                }}>{tag}</span>
              ))}
            </div>

            {/* Guest count editor */}
            <div style={{
              background: "#fff",
              border: "1.5px solid rgba(217,119,6,0.2)",
              borderRadius: "14px", padding: "1.2rem 1.5rem",
              marginBottom: "1rem",
              display: "flex", alignItems: "center",
              justifyContent: "space-between", flexWrap: "wrap", gap: "1rem",
            }}>
              <div>
                <div style={{
                  fontSize: "0.82rem", fontWeight: 500,
                  color: "#3D1A00", marginBottom: "2px",
                }}>Adjust guest count</div>
                <div style={{
                  fontSize: "0.78rem", color: "#92400E", fontWeight: 300,
                }}>Venue capacity: {selections.venue?.capacity || 500}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <button onClick={() => handleGuestChange(guests - 5)} style={{
                  width: "34px", height: "34px", borderRadius: "50%",
                  border: "1.5px solid rgba(217,119,6,0.3)",
                  background: "transparent", color: "#D97706",
                  fontSize: "1.1rem", cursor: "pointer",
                }}>−</button>
                <input
                  type="number"
                  value={guests}
                  onChange={e => handleGuestChange(Number(e.target.value))}
                  style={{
                    width: "70px", textAlign: "center",
                    padding: "0.4rem", border: "1.5px solid rgba(217,119,6,0.3)",
                    borderRadius: "8px", fontSize: "1rem",
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#1C0A00", background: "#FFFBEB", outline: "none",
                  }}
                />
                <button onClick={() => handleGuestChange(guests + 5)} style={{
                  width: "34px", height: "34px", borderRadius: "50%",
                  border: "1.5px solid rgba(217,119,6,0.3)",
                  background: "transparent", color: "#D97706",
                  fontSize: "1.1rem", cursor: "pointer",
                }}>+</button>
              </div>
            </div>

            {/* Line items */}
            <div style={{
              background: "#fff",
              border: "1.5px solid rgba(217,119,6,0.15)",
              borderRadius: "16px", overflow: "hidden",
            }}>
              {LINE_ITEMS.map((item, i) => (
                <div key={item.label} style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "1.1rem 1.5rem",
                  borderBottom: i < LINE_ITEMS.length - 1
                    ? "1px solid rgba(217,119,6,0.08)" : "none",
                  transition: "background 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#FFFBEB"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                    <span style={{ fontSize: "1.3rem" }}>{item.icon}</span>
                    <div>
                      <div style={{
                        fontSize: "0.9rem", fontWeight: 500,
                        color: "#1C0A00",
                      }}>{item.label}</div>
                      <div style={{
                        fontSize: "0.78rem", color: "#92400E",
                        fontWeight: 300,
                      }}>{item.sublabel} · {item.detail}</div>
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "1.2rem", fontWeight: 700,
                    color: item.amount > 0 ? "#1C0A00" : "rgba(120,53,15,0.3)",
                  }}>
                    {item.amount > 0 ? `₹${item.amount.toLocaleString()}` : "—"}
                  </div>
                </div>
              ))}

              {/* Subtotal row */}
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "1.2rem 1.5rem",
                background: "rgba(217,119,6,0.05)",
                borderTop: "2px solid rgba(217,119,6,0.15)",
              }}>
                <div style={{
                  fontSize: "0.82rem", fontWeight: 500,
                  color: "#78350F", letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}>Estimated Total</div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1rem", color: "#92400E", fontWeight: 400,
                }}>Before taxes & final adjustments</div>
              </div>
            </div>

            {/* Note */}
            <p style={{
              fontSize: "0.78rem", color: "rgba(120,53,15,0.5)",
              marginTop: "0.75rem", fontWeight: 300, lineHeight: 1.6,
            }}>
              * Final pricing will be confirmed by your event manager during the consultation. This estimate is based on your current selections.
            </p>
          </div>

          {/* ── Right: Grand total card ── */}
          <div style={{
            background: "linear-gradient(160deg, #1C0A00 0%, #3D1A00 100%)",
            borderRadius: "20px", padding: "2rem 1.8rem",
            minWidth: "220px", textAlign: "center",
            position: "sticky", top: "2rem",
          }} className="total-card">
            <div style={{
              fontSize: "0.72rem", letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(255,251,235,0.5)",
              marginBottom: "0.5rem",
            }}>Grand Total</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "2.6rem", fontWeight: 700,
              color: "#F59E0B", lineHeight: 1,
              marginBottom: "0.4rem",
            }}>
              ₹{grandTotal.toLocaleString()}
            </div>
            <div style={{
              fontSize: "0.75rem", color: "rgba(255,251,235,0.35)",
              marginBottom: "2rem", fontWeight: 300,
            }}>for {guests} guests</div>

            {/* Per head */}
            <div style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "10px", padding: "0.75rem",
              marginBottom: "2rem",
            }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.4rem", fontWeight: 700, color: "#FCD34D",
              }}>₹{Math.round(grandTotal / guests).toLocaleString()}</div>
              <div style={{
                fontSize: "0.72rem", color: "rgba(255,251,235,0.4)",
                fontWeight: 300,
              }}>per person</div>
            </div>

            {/* Theme swatch */}
            {selections.theme && (
              <div style={{ marginBottom: "2rem" }}>
                <div style={{
                  fontSize: "0.72rem", color: "rgba(255,251,235,0.4)",
                  marginBottom: "0.5rem", letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>Theme</div>
                <div style={{
                  fontSize: "0.8rem", color: "rgba(255,251,235,0.6)",
                  marginTop: "0.4rem",
                }}>{selections.theme.name}</div>
              </div>
            )}

            <button
              onClick={() => navigate("/plan/schedule")}
              style={{
                width: "100%", padding: "0.85rem",
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
                border: "none", borderRadius: "10px",
                color: "#1C1917", fontSize: "0.92rem",
                fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(245,158,11,0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(245,158,11,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 20px rgba(245,158,11,0.3)"; }}
            >
              Schedule Meeting →
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width: 768px) {
          .breakdown-grid { grid-template-columns: 1fr !important; }
          .total-card { position: static !important; }
        }
      `}</style>
      <ChatWidget />
    </div>
  );
}
