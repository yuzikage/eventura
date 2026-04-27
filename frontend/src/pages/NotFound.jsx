import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFonts } from "../hooks/useFonts";

export default function NotFound() {
  useFonts();
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #1C0A00 0%, #3D1A00 50%, #1A0A00 100%)",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* Topbar */}
      <div style={{
        height: "60px",
        display: "flex", alignItems: "center",
        padding: "0 2rem",
        borderBottom: "1px solid rgba(245,158,11,0.1)",
      }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#F59E0B", fontSize: "20px" }}>✦</span>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.3rem", fontWeight: 700, color: "#FCD34D",
          }}>Eventura</span>
        </Link>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: "3rem clamp(1.5rem, 5vw, 3rem)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: "absolute", top: "10%", right: "5%",
          width: "400px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "5%", left: "0%",
          width: "350px", height: "350px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220,38,38,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{
          textAlign: "center", position: "relative", zIndex: 1,
          maxWidth: "560px",
        }}>
          {/* 404 number */}
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(7rem, 20vw, 12rem)",
            fontWeight: 700, lineHeight: 1,
            color: "transparent",
            WebkitTextStroke: "2px rgba(245,158,11,0.25)",
            marginBottom: "2rem",
            animation: "fadeUp 0.7s ease both",
            userSelect: "none",
          }}>404</div>

          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
            fontWeight: 700, color: "#FFFBEB",
            margin: "0 0 0.75rem", lineHeight: 1.1,
            animation: "fadeUp 0.7s 0.2s ease both",
          }}>
            This page went off-script
          </h1>

          <p style={{
            fontSize: "0.95rem", color: "rgba(255,251,235,0.5)",
            margin: "0 0 2.5rem", fontWeight: 300, lineHeight: 1.7,
            animation: "fadeUp 0.7s 0.3s ease both",
          }}>
            Looks like the page you're looking for doesn't exist or has been moved. Let's get you back to planning something wonderful.
          </p>

          {/* Actions */}
          <div style={{
            display: "flex", gap: "1rem",
            justifyContent: "center", flexWrap: "wrap",
            animation: "fadeUp 0.7s 0.4s ease both",
          }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: "transparent",
                border: "1px solid rgba(252,211,77,0.3)",
                color: "#FCD34D", padding: "0.85rem 2rem",
                borderRadius: "100px", fontWeight: 400,
                fontSize: "0.95rem",
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(252,211,77,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              ← Go Back
            </button>
            <Link to="/" style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: "#1C1917", padding: "0.85rem 2rem",
              borderRadius: "100px", fontWeight: 500,
              fontSize: "0.95rem", textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 6px 20px rgba(245,158,11,0.35)",
              transition: "all 0.2s", display: "inline-block",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(245,158,11,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 20px rgba(245,158,11,0.35)"; }}
            >
              Back to Home
            </Link>
            <Link to="/plan" style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
              color: "#F59E0B", padding: "0.85rem 2rem",
              borderRadius: "100px", fontWeight: 400,
              fontSize: "0.95rem", textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s", display: "inline-block",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(245,158,11,0.15)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(245,158,11,0.1)"}
            >
              Plan an Event →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
