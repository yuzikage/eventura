import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { useFonts } from "../../hooks/useFonts";

export default function Login() {
  useFonts();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectMessage = location.state?.message;
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await authApi.login({ email: data.email, password: data.password });

      // This page is for customers only — block staff from logging in here
      if (res.user.role !== "customer") {
        setApiError("This login is for customers only. Please use the Staff login.");
        return;
      }

      login(res);
      navigate("/dashboard");
    } catch (err) {
      if (err.status === 401) {
        setApiError("Invalid email or password. Please try again.");
      } else {
        setApiError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      fontFamily: "'DM Sans', sans-serif",
      background: "#0F0500",
    }}>

      {/* Left panel – decorative */}
      <div style={{
        position: "relative",
        background: "linear-gradient(160deg, #1C0A00 0%, #3D1A00 60%, #2D0E00 100%)",
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        padding: "3rem",
        overflow: "hidden",
      }} className="auth-left-panel">

        {/* Glow blobs */}
        <div style={{
          position: "absolute", top: "-10%", right: "-10%",
          width: "400px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-5%", left: "-5%",
          width: "350px", height: "350px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Floating ornaments */}
        {["✦", "❋", "✦", "❋", "✦"].map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${15 + i * 16}%`,
            left: `${10 + (i % 3) * 25}%`,
            fontSize: `${12 + i * 4}px`,
            color: "#F59E0B",
            opacity: 0.08 + i * 0.04,
            animation: `floatOrn ${4 + i}s ease-in-out infinite`,
            pointerEvents: "none",
          }}>{s}</div>
        ))}

        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", zIndex: 1 }}>
          <span style={{ fontSize: "26px", color: "#F59E0B" }}>✦</span>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.6rem", fontWeight: 700, color: "#FCD34D",
          }}>Eventura</span>
        </Link>

        {/* Center quote */}
        <div style={{ zIndex: 1 }}>
          <div style={{
            width: "48px", height: "3px",
            background: "linear-gradient(to right, #F59E0B, transparent)",
            marginBottom: "1.5rem",
          }} />
          <blockquote style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.6rem, 2.5vw, 2.4rem)",
            fontWeight: 600, fontStyle: "italic",
            color: "#FFFBEB", lineHeight: 1.3,
            margin: 0,
          }}>
            "Every great event begins with a single decision."
          </blockquote>
          <p style={{
            marginTop: "1.2rem",
            fontSize: "0.85rem", color: "rgba(255,251,235,0.4)",
            fontWeight: 300,
          }}>
            Plan your perfect event — weddings, celebrations, corporate gatherings — all in one place.
          </p>
        </div>

        {/* Bottom tag */}
        <div style={{
          zIndex: 1,
          fontSize: "0.75rem", color: "rgba(255,251,235,0.25)",
          letterSpacing: "0.06em",
        }}>
          © 2026 Eventura · Coochbehar
        </div>

        <style>{`
          @keyframes floatOrn {
            0%,100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(15deg); }
          }
          @media(max-width: 768px) {
            .auth-left-panel { display: none !important; }
            .auth-right-panel { grid-column: 1 / -1 !important; }
          }
        `}</style>
      </div>

      {/* Right panel – form */}
      <div className="auth-right-panel" style={{
        background: "#FFFBEB",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "3rem clamp(1.5rem, 6vw, 5rem)",
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {/* Header */}
          <div style={{ marginBottom: "2.5rem" }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              fontWeight: 700, color: "#1C0A00",
              margin: "0 0 0.5rem", lineHeight: 1.1,
            }}>
              Welcome back
            </h1>
            <p style={{
              fontSize: "0.92rem", color: "#78350F",
              margin: 0, fontWeight: 300,
            }}>
              Sign in to continue planning your event
            </p>
          </div>

          {/* Redirect message (shown when bounced from protected route) */}
          {redirectMessage && (
            <div style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "10px", padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              fontSize: "0.85rem", color: "#92400E",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              🔒 {redirectMessage}
            </div>
          )}

          {/* API error banner */}
          {apiError && (
            <div style={{
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: "10px", padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              fontSize: "0.85rem", color: "#DC2626",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              ⚠️ {apiError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* Email field */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{
                display: "block", fontSize: "0.82rem",
                fontWeight: 500, color: "#3D1A00",
                marginBottom: "0.5rem", letterSpacing: "0.03em",
              }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
                })}
                style={{
                  width: "100%", padding: "0.8rem 1rem",
                  border: errors.email ? "1.5px solid #DC2626" : "1.5px solid rgba(217,119,6,0.25)",
                  borderRadius: "10px", fontSize: "0.95rem",
                  fontFamily: "'DM Sans', sans-serif",
                  background: "#fff", color: "#1C0A00",
                  outline: "none", transition: "border 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.border = "1.5px solid #F59E0B"}
                onBlur={e => e.target.style.border = errors.email ? "1.5px solid #DC2626" : "1.5px solid rgba(217,119,6,0.25)"}
              />
              {errors.email && (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#DC2626" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{
                display: "block", fontSize: "0.82rem",
                fontWeight: 500, color: "#3D1A00",
                marginBottom: "0.5rem", letterSpacing: "0.03em",
              }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "Minimum 6 characters" },
                  })}
                  style={{
                    width: "100%", padding: "0.8rem 3rem 0.8rem 1rem",
                    border: errors.password ? "1.5px solid #DC2626" : "1.5px solid rgba(217,119,6,0.25)",
                    borderRadius: "10px", fontSize: "0.95rem",
                    fontFamily: "'DM Sans', sans-serif",
                    background: "#fff", color: "#1C0A00",
                    outline: "none", transition: "border 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.border = "1.5px solid #F59E0B"}
                  onBlur={e => e.target.style.border = errors.password ? "1.5px solid #DC2626" : "1.5px solid rgba(217,119,6,0.25)"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: "0.9rem", top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    cursor: "pointer", fontSize: "1rem",
                    color: "#92400E", padding: 0,
                  }}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              {errors.password && (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#DC2626" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginBottom: "2rem" }}>
              <a href="#" style={{
                fontSize: "0.82rem", color: "#D97706",
                textDecoration: "none", fontWeight: 500,
              }}
                onMouseEnter={e => e.target.style.textDecoration = "underline"}
                onMouseLeave={e => e.target.style.textDecoration = "none"}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%", padding: "0.9rem",
                background: isLoading
                  ? "rgba(245,158,11,0.5)"
                  : "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                color: "#1C1917", border: "none",
                borderRadius: "10px", fontSize: "1rem",
                fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: isLoading ? "none" : "0 6px 20px rgba(245,158,11,0.35)",
                transition: "all 0.2s",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: "8px",
              }}
              onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(245,158,11,0.45)"; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = isLoading ? "none" : "0 6px 20px rgba(245,158,11,0.35)"; }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: "16px", height: "16px",
                    border: "2px solid rgba(28,25,23,0.3)",
                    borderTopColor: "#1C1917",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Signing in...
                </>
              ) : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: "flex", alignItems: "center",
            gap: "1rem", margin: "1.8rem 0",
          }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(217,119,6,0.2)" }} />
            <span style={{ fontSize: "0.8rem", color: "#92400E", fontWeight: 300 }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(217,119,6,0.2)" }} />
          </div>

          {/* Signup link */}
          <p style={{
            textAlign: "center", fontSize: "0.9rem",
            color: "#78350F", margin: 0,
          }}>
            Don't have an account?{" "}
            <Link to="/signup" style={{
              color: "#D97706", fontWeight: 500,
              textDecoration: "none",
            }}
              onMouseEnter={e => e.target.style.textDecoration = "underline"}
              onMouseLeave={e => e.target.style.textDecoration = "none"}
            >
              Create one
            </Link>
          </p>

          {/* Manager/Admin link */}
          <p style={{
            textAlign: "center", fontSize: "0.78rem",
            color: "rgba(120,53,15,0.5)", marginTop: "1.5rem",
          }}>
            Are you staff?{" "}
            <Link to="/staff/login" style={{
              color: "rgba(217,119,6,0.7)", textDecoration: "none",
            }}>
              Staff login →
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
