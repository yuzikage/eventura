import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFonts } from "../../hooks/useFonts";

// Intersection observer hook for scroll reveals
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// Data
const EVENT_CATEGORIES = [
  { icon: "💍", label: "Weddings", desc: "Intimate to grand — every detail perfected" },
  { icon: "🎊", label: "Social Events", desc: "Anniversaries, reunions & milestones" },
  { icon: "🏢", label: "Corporate", desc: "Seminars, product launches & offsites" },
  { icon: "🎂", label: "Birthdays", desc: "From first birthdays to golden jubilees" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Plan Online", desc: "Choose your city, venue, theme and guest count from our curated catalog — all in one place." },
  { step: "02", title: "Get a Quote", desc: "See a live price breakdown as you select packages for catering, photography and décor." },
  { step: "03", title: "Meet & Confirm", desc: "Schedule a consultation with your dedicated event manager and lock in your dream event." },
];

const GALLERY = [
  { label: "Royal Marigold", tag: "Wedding", bg: "#C2410C", emoji: "🌸" },
  { label: "Garden Soirée", tag: "Social", bg: "#92400E", emoji: "🌿" },
  { label: "Midnight Gala", tag: "Corporate", bg: "#1C1917", emoji: "✨" },
  { label: "Festive Bazaar", tag: "Birthday", bg: "#B45309", emoji: "🎉" },
  { label: "Pastel Dreams", tag: "Wedding", bg: "#9D174D", emoji: "🌷" },
  { label: "Golden Hour", tag: "Social", bg: "#78350F", emoji: "🌅" },
];

const TESTIMONIALS = [
  { name: "Priya & Arjun Sharma", event: "Wedding, Jan 2025", quote: "Every single detail was exactly as we imagined. Our guests still talk about how magical the evening felt." },
  { name: "Rohan Mehta", event: "Corporate Summit, Nov 2024", quote: "Seamless from start to finish. The team handled 200+ guests without a single hiccup. Absolutely professional." },
  { name: "Sunita Agarwal", event: "50th Anniversary, Mar 2025", quote: "I cried happy tears the moment I walked into the venue. They turned our vision into something beyond beautiful." },
];

// Navbar
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        transition: "all 0.4s ease",
        background: scrolled ? "rgba(15,10,5,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(251,191,36,0.15)" : "none",
        padding: "0 clamp(1.5rem,5vw,4rem)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: "72px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "28px", color: "#F59E0B"  }}>✦</span>
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1.6rem", fontWeight: 700,
          color: "#FCD34D", letterSpacing: "0.02em",
        }}>
          Eventura
        </span>
      </Link>

      {/* Desktop links */}
      <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}
        className="desktop-nav">
        <Link to="/login" style={{
          background: "linear-gradient(135deg, #F59E0B, #D97706)",
          color: "#1C1917", padding: "0.5rem 1.4rem",
          borderRadius: "100px", fontWeight: 500,
          fontSize: "0.9rem", textDecoration: "none",
          transition: "transform 0.2s, box-shadow 0.2s",
          boxShadow: "0 4px 15px rgba(245,158,11,0.35)",
        }}
          onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 25px rgba(245,158,11,0.5)"; }}
          onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 15px rgba(245,158,11,0.35)"; }}
        >
          Get Started
        </Link>
      </div>

      {/* Mobile hamburger */}
      <button onClick={() => setMenuOpen(!menuOpen)} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "#FCD34D", fontSize: "1.5rem", display: "none",
      }} className="hamburger">☰</button>

      <style>{`
        @media(max-width:768px){
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </nav>
  );
}

// Hero section
function Hero() {
  return (
    <section style={{
      minHeight: "100vh", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      background: "linear-gradient(160deg, #1C0A00 0%, #3D1A00 40%, #1A0A00 100%)",
    }}>
      {/* Decorative circles */}
      <div style={{
        position: "absolute", top: "-10%", right: "-5%",
        width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-15%", left: "-8%",
        width: "500px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Floating petals */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${10 + i * 14}%`,
          left: `${5 + i * 15}%`,
          fontSize: `${14 + i * 3}px`,
          opacity: 0.15 + i * 0.05,
          animation: `float${i % 3} ${4 + i}s ease-in-out infinite`,
          pointerEvents: "none",
        }}>✦</div>
      ))}

      {/* Content */}
      <div style={{
        textAlign: "center", padding: "0 clamp(1.5rem,8vw,8rem)",
        maxWidth: "900px", position: "relative", zIndex: 1,
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: "100px", padding: "0.35rem 1rem",
          marginBottom: "2rem",
          marginTop: "2rem",
          animation: "fadeUp 0.8s ease both",
        }}>
          <span style={{ fontSize: "12px" }}>✦</span>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.8rem", color: "#FCD34D",
            letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500,
          }}>
            Coochbehar's Premier Event Studio
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(3.2rem, 8vw, 6rem)",
          fontWeight: 700, lineHeight: 1.05,
          color: "#FFFBEB", margin: "0 0 1rem",
          animation: "fadeUp 0.8s 0.15s ease both",
        }}>
          Where Every
          <span style={{
            display: "block",
            color: "#F59E0B",
            fontStyle: "italic",
          }}>Celebration</span>
          Becomes Legend
        </h1>

        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "clamp(1rem, 2vw, 1.2rem)",
          color: "rgba(255,251,235,0.65)", fontWeight: 300,
          lineHeight: 1.8, maxWidth: "580px", margin: "0 auto 2.5rem",
          animation: "fadeUp 0.8s 0.3s ease both",
        }}>
          From intimate gatherings to grand weddings — we craft unforgettable experiences with meticulous attention to every detail.
        </p>

        <div style={{
          display: "flex", gap: "1rem", justifyContent: "center",
          flexWrap: "wrap",
          animation: "fadeUp 0.8s 0.45s ease both",
        }}>
          <Link to="/login" style={{
            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            color: "#1C1917", padding: "0.9rem 2.2rem",
            borderRadius: "100px", fontWeight: 500,
            fontSize: "1rem", textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 8px 30px rgba(245,158,11,0.4)",
            transition: "transform 0.2s, box-shadow 0.2s",
            display: "inline-block",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(245,158,11,0.55)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 30px rgba(245,158,11,0.4)"; }}
          >
            Start Planning Your Event
          </Link>
          <a href="#how-it-works" style={{
            background: "transparent",
            border: "1px solid rgba(252,211,77,0.4)",
            color: "#FCD34D", padding: "0.9rem 2.2rem",
            borderRadius: "100px", fontWeight: 400,
            fontSize: "1rem", textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.2s",
            display: "inline-block",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(252,211,77,0.08)"; e.currentTarget.style.borderColor = "#FCD34D"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(252,211,77,0.4)"; }}
          >
            See How It Works
          </a>
        </div>

        {/* Stats bar */}
        <div style={{
          display: "flex", gap: "clamp(1.5rem,5vw,3rem)",
          justifyContent: "center", marginTop: "2rem", marginBottom: "8rem",
          flexWrap: "wrap",
          animation: "fadeUp 0.8s 0.6s ease both",
        }}>
          {[["200+", "Events Delivered"], ["8+", "Years Experience"], ["50+", "Venue Partners"], ["98%", "Happy Clients"]].map(([num, lbl]) => (
            <div key={lbl} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 700,
                color: "#F59E0B", lineHeight: 1,
              }}>{num}</div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.78rem", color: "rgba(255,251,235,0.5)",
                letterSpacing: "0.08em", textTransform: "uppercase",
                marginTop: "4px",
              }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: "absolute", bottom: "2rem", left: "50%",
        transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
        animation: "bounce 2s ease-in-out infinite",
        opacity: 0.5,
      }}>
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", color: "#FCD34D", letterSpacing: "0.1em", textTransform: "uppercase" }}>Scroll</span>
        <div style={{ width: "1px", height: "40px", background: "linear-gradient(to bottom, #F59E0B, transparent)" }} />
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float0 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-12px) rotate(20deg)} }
        @keyframes float1 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-8px) rotate(-15deg)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-16px) rotate(25deg)} }
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(8px)} }
      `}</style>
    </section>
  );
}

// Event Categories
function Categories() {
  const [ref, visible] = useReveal();
  return (
    <section id="services" ref={ref} style={{
      padding: "6rem clamp(1.5rem,8vw,8rem)",
      background: "#FFF8EE",
    }}>
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.78rem", letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#D97706", fontWeight: 500,
        }}>What We Do</span>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(2.2rem,5vw,3.5rem)", fontWeight: 700,
          color: "#1C0A00", margin: "0.5rem 0 0", lineHeight: 1.1,
        }}>Every Occasion, <em>Perfected</em></h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.5rem", maxWidth: "1100px", margin: "0 auto",
      }}>
        {EVENT_CATEGORIES.map((cat, i) => (
          <div key={cat.label}
            style={{
              background: "#fff",
              border: "1px solid rgba(217,119,6,0.12)",
              borderRadius: "20px", padding: "2.2rem 1.8rem",
              textAlign: "center", cursor: "pointer",
              transition: "all 0.3s ease",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(30px)",
              transitionDelay: `${i * 0.1}s`,
              boxShadow: "0 2px 16px rgba(28,10,0,0.06)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 16px 40px rgba(217,119,6,0.18)";
              e.currentTarget.style.borderColor = "rgba(217,119,6,0.4)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = visible ? "translateY(0)" : "translateY(30px)";
              e.currentTarget.style.boxShadow = "0 2px 16px rgba(28,10,0,0.06)";
              e.currentTarget.style.borderColor = "rgba(217,119,6,0.12)";
            }}
          >
            <div style={{ fontSize: "2.8rem", marginBottom: "1rem" }}>{cat.icon}</div>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.5rem", fontWeight: 700,
              color: "#1C0A00", margin: "0 0 0.5rem",
            }}>{cat.label}</h3>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.88rem", color: "#78350F",
              lineHeight: 1.6, margin: 0, fontWeight: 300,
            }}>{cat.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Gallery
function Gallery() {
  const [ref, visible] = useReveal();
  return (
    <section id="venues" ref={ref} style={{
      padding: "6rem clamp(1.5rem,8vw,8rem)",
      background: "#1C0A00",
    }}>
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.78rem", letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#F59E0B", fontWeight: 500,
        }}>Featured Themes</span>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(2.2rem,5vw,3.5rem)", fontWeight: 700,
          color: "#FFFBEB", margin: "0.5rem 0 0", lineHeight: 1.1,
        }}>Curated for <em>Your Story</em></h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1.2rem", maxWidth: "1100px", margin: "0 auto",
      }}>
        {GALLERY.map((item, i) => (
          <div key={item.label}
            style={{
              background: item.bg,
              borderRadius: "16px", padding: "3rem 2rem",
              position: "relative", overflow: "hidden",
              cursor: "pointer", minHeight: "200px",
              display: "flex", flexDirection: "column",
              justifyContent: "flex-end",
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.92)",
              transition: `all 0.5s ease ${i * 0.08}s`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "scale(1.03)";
              e.currentTarget.style.boxShadow = "0 20px 50px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{
              position: "absolute", top: "1.5rem", right: "1.5rem",
              fontSize: "2.5rem", opacity: 0.4,
            }}>{item.emoji}</div>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.7rem", letterSpacing: "0.12em",
                textTransform: "uppercase", color: "#FCD34D",
                background: "rgba(252,211,77,0.15)",
                padding: "0.2rem 0.6rem", borderRadius: "100px",
                marginBottom: "0.5rem", display: "inline-block",
              }}>{item.tag}</span>
              <h3 style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.5rem", fontWeight: 600,
                color: "#fff", margin: 0,
              }}>{item.label}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// How It Works
function HowItWorks() {
  const [ref, visible] = useReveal();
  return (
    <section id="how-it-works" ref={ref} style={{
      padding: "6rem clamp(1.5rem,8vw,8rem)",
      background: "#FFF8EE",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ textAlign: "center", marginBottom: "4rem" }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.78rem", letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#D97706", fontWeight: 500,
        }}>Simple Process</span>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(2.2rem,5vw,3.5rem)", fontWeight: 700,
          color: "#1C0A00", margin: "0.5rem 0 0", lineHeight: 1.1,
        }}>Your Event in <em>Three Steps</em></h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "2rem", maxWidth: "1000px", margin: "0 auto",
        position: "relative", zIndex: 1,
      }}>
        {HOW_IT_WORKS.map((step, i) => (
          <div key={step.step}
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(40px)",
              transition: `all 0.6s ease ${i * 0.15}s`,
            }}
          >
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "4rem", fontWeight: 700,
              color: "rgba(217,119,6,0.18)", lineHeight: 1,
              marginBottom: "0.5rem",
            }}>{step.step}</div>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.6rem", fontWeight: 700,
              color: "#1C0A00", margin: "0 0 0.75rem",
            }}>{step.title}</h3>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.92rem", color: "#78350F",
              lineHeight: 1.7, margin: 0, fontWeight: 300,
            }}>{step.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: "3.5rem" }}>
        <Link to="/login" style={{
          background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
          color: "#1C1917", padding: "0.9rem 2.5rem",
          borderRadius: "100px", fontWeight: 500,
          fontSize: "1rem", textDecoration: "none",
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: "0 8px 30px rgba(245,158,11,0.35)",
          display: "inline-block",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 14px 40px rgba(245,158,11,0.5)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 30px rgba(245,158,11,0.35)"; }}
        >
          Begin Your Journey →
        </Link>
      </div>
    </section>
  );
}

// Testimonials
function Testimonials() {
  const [ref, visible] = useReveal();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section ref={ref} style={{
      padding: "6rem clamp(1.5rem,8vw,8rem)",
      background: "linear-gradient(160deg, #1C0A00 0%, #2D1200 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: "radial-gradient(circle at 20% 50%, rgba(245,158,11,0.07) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(220,38,38,0.05) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      <div style={{ textAlign: "center", marginBottom: "3.5rem", position: "relative", zIndex: 1 }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.78rem", letterSpacing: "0.14em",
          textTransform: "uppercase", color: "#F59E0B", fontWeight: 500,
        }}>Stories</span>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(2.2rem,5vw,3.5rem)", fontWeight: 700,
          color: "#FFFBEB", margin: "0.5rem 0 0", lineHeight: 1.1,
        }}>Told by Our <em>Clients</em></h2>
      </div>

      <div style={{
        maxWidth: "700px", margin: "0 auto",
        position: "relative", zIndex: 1,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease",
      }}>
        {TESTIMONIALS.map((t, i) => (
          <div key={i} style={{
            display: i === active ? "block" : "none",
            textAlign: "center",
            animation: i === active ? "fadeUp 0.6s ease both" : "none",
          }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(1.3rem,3vw,1.8rem)", fontWeight: 400,
              fontStyle: "italic", color: "#FFF8EE",
              lineHeight: 1.6, marginBottom: "2rem",
            }}>
              "{t.quote}"
            </div>
            <div style={{
              width: "40px", height: "2px",
              background: "#F59E0B", margin: "0 auto 1.5rem",
            }} />
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.95rem", fontWeight: 500,
              color: "#FCD34D",
            }}>{t.name}</div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.8rem", color: "rgba(255,251,235,0.45)",
              marginTop: "4px",
            }}>{t.event}</div>
          </div>
        ))}

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "2.5rem" }}>
          {TESTIMONIALS.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} style={{
              width: i === active ? "24px" : "8px",
              height: "8px", borderRadius: "100px",
              background: i === active ? "#F59E0B" : "rgba(245,158,11,0.3)",
              border: "none", cursor: "pointer",
              transition: "all 0.3s ease", padding: 0,
            }} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer style={{
      background: "#0F0500",
      padding: "3rem clamp(1.5rem,8vw,8rem)",
      borderTop: "1px solid rgba(245,158,11,0.1)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: "1.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px", color: "#F59E0B" }}>✦</span>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.4rem", fontWeight: 700, color: "#FCD34D",
          }}>Eventura</span>
        </div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.82rem", color: "rgba(255,251,235,0.3)",
        }}>
          © 2026 Eventura. Crafting memories in Coochbehar.
        </div>
      </div>
    </footer>
  );
}

// Main component
export default function Landing() {
  useFonts();
  return (
    <div style={{ margin: 0, padding: 0, background: "#1C0A00" }}>
      <Navbar />
      <Hero />
      <Categories />
      <Gallery />
      <HowItWorks />
      <Testimonials />
      <Footer />
    </div>
  );
}
