import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { useFonts } from "../../hooks/useFonts";

export default function StaffLogin() {
  useFonts();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectMessage = location.state?.message;
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("manager");
  const [apiError, setApiError] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await authApi.login({ email: data.email, password: data.password });

      // Block customers from using the staff portal
      if (res.user.role !== "manager" && res.user.role !== "admin") {
        setApiError("This portal is for staff only. Please use the customer login.");
        return;
      }

      // Block role mismatch — selected Manager but account is Admin, or vice versa
      if (res.user.role !== selectedRole) {
        setApiError(
          `This account is registered as ${res.user.role === "manager" ? "Event Manager" : "Administrator"}. Please select the correct role above.`
        );
        return;
      }

      login(res);

      if (res.user.role === "manager") navigate("/manager");
      else navigate("/admin");
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
      minHeight: "100vh", display: "grid",
      gridTemplateColumns: "1fr 1fr",
      fontFamily: "'DM Sans', sans-serif",
      background: "#0F0500",
    }}>
      {/* Left decorative panel */}
      <div style={{
        position: "relative",
        background: "linear-gradient(160deg, #0C1445 0%, #1a2260 60%, #0a0f2e 100%)",
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        padding: "3rem", overflow: "hidden",
      }} className="staff-left-panel">

        <div style={{
          position: "absolute", top: "-10%", right: "-10%",
          width: "400px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-5%", left: "-5%",
          width: "350px", height: "350px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {["✦", "◈", "✦", "◈", "✦"].map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${15 + i * 16}%`, left: `${10 + (i % 3) * 25}%`,
            fontSize: `${12 + i * 4}px`, color: "#818CF8",
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

        {/* Center content */}
        <div style={{ zIndex: 1 }}>
          <div style={{
            width: "48px", height: "3px",
            background: "linear-gradient(to right, #818CF8, transparent)",
            marginBottom: "1.5rem",
          }} />
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "100px", padding: "0.35rem 1rem",
            marginBottom: "1.5rem",
          }}>
            <span style={{ fontSize: "0.75rem", color: "#A5B4FC", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Staff Portal
            </span>
          </div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.8rem, 2.8vw, 2.6rem)",
            fontWeight: 700, fontStyle: "italic",
            color: "#EEF2FF", lineHeight: 1.2, margin: "0 0 1rem",
          }}>
            Manage events with confidence.
          </h2>
          <p style={{
            fontSize: "0.88rem", color: "rgba(238,242,255,0.4)",
            fontWeight: 300, lineHeight: 1.7, margin: 0,
          }}>
            Access your dashboard to oversee bookings, manage schedules, and keep every event running smoothly.
          </p>

          {/* Role badges */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
            {["Event Manager", "Administrator"].map(r => (
              <div key={r} style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "8px", padding: "0.5rem 0.9rem",
                fontSize: "0.78rem", color: "#A5B4FC",
              }}>{r}</div>
            ))}
          </div>
        </div>

        <div style={{
          zIndex: 1, fontSize: "0.75rem",
          color: "rgba(238,242,255,0.2)", letterSpacing: "0.06em",
        }}>
          © 2026 Eventura · Staff Access Only
        </div>

        <style>{`
          @keyframes floatOrn {
            0%,100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(15deg); }
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          @media(max-width: 768px) {
            .staff-left-panel { display: none !important; }
            .staff-right-panel { grid-column: 1 / -1 !important; }
          }
        `}</style>
      </div>

      {/* Right panel – form */}
      <div className="staff-right-panel" style={{
        background: "#F5F3FF",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "3rem clamp(1.5rem, 6vw, 5rem)",
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          <div style={{ marginBottom: "2.5rem" }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              fontWeight: 700, color: "#1E1B4B",
              margin: "0 0 0.5rem", lineHeight: 1.1,
            }}>Staff Login</h1>
            <p style={{
              fontSize: "0.92rem", color: "#4338CA",
              margin: 0, fontWeight: 300, opacity: 0.7,
            }}>
              Sign in to access your staff dashboard
            </p>
          </div>

          {redirectMessage && (
            <div style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: "10px", padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              fontSize: "0.85rem", color: "#4338CA",
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

          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* Role selector — purely cosmetic, actual role comes from the API */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block", fontSize: "0.82rem", fontWeight: 500,
                color: "#2D2A6E", marginBottom: "0.5rem", letterSpacing: "0.03em",
              }}>I am a</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[
                  { id: "manager", label: "Event Manager", icon: "📋" },
                  { id: "admin",   label: "Administrator",  icon: "⚙️" },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedRole(opt.id)}
                    style={{
                      padding: "0.85rem",
                      border: selectedRole === opt.id
                        ? "2px solid #6366F1"
                        : "1.5px solid rgba(99,102,241,0.2)",
                      borderRadius: "12px",
                      background: selectedRole === opt.id ? "rgba(99,102,241,0.08)" : "#fff",
                      cursor: "pointer", transition: "all 0.2s",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", gap: "4px",
                    }}
                  >
                    <span style={{ fontSize: "1.3rem" }}>{opt.icon}</span>
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.8rem", fontWeight: selectedRole === opt.id ? 500 : 400,
                      color: selectedRole === opt.id ? "#4338CA" : "#6B7280",
                    }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{
                display: "block", fontSize: "0.82rem", fontWeight: 500,
                color: "#2D2A6E", marginBottom: "0.5rem",
              }}>Email address</label>
              <input
                type="email"
                placeholder="staff@eventura.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
                })}
                style={{
                  width: "100%", padding: "0.8rem 1rem",
                  border: errors.email ? "1.5px solid #DC2626" : "1.5px solid rgba(99,102,241,0.25)",
                  borderRadius: "10px", fontSize: "0.95rem",
                  fontFamily: "'DM Sans', sans-serif",
                  background: "#fff", color: "#1E1B4B",
                  outline: "none", transition: "border 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.border = "1.5px solid #6366F1"}
                onBlur={e => e.target.style.border = errors.email ? "1.5px solid #DC2626" : "1.5px solid rgba(99,102,241,0.25)"}
              />
              {errors.email && <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#DC2626" }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: "2rem" }}>
              <label style={{
                display: "block", fontSize: "0.82rem", fontWeight: 500,
                color: "#2D2A6E", marginBottom: "0.5rem",
              }}>Password</label>
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
                    border: errors.password ? "1.5px solid #DC2626" : "1.5px solid rgba(99,102,241,0.25)",
                    borderRadius: "10px", fontSize: "0.95rem",
                    fontFamily: "'DM Sans', sans-serif",
                    background: "#fff", color: "#1E1B4B",
                    outline: "none", transition: "border 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.border = "1.5px solid #6366F1"}
                  onBlur={e => e.target.style.border = errors.password ? "1.5px solid #DC2626" : "1.5px solid rgba(99,102,241,0.25)"}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: "absolute", right: "0.9rem", top: "50%",
                  transform: "translateY(-50%)", background: "none",
                  border: "none", cursor: "pointer", fontSize: "1rem",
                  color: "#6366F1", padding: 0,
                }}>{showPassword ? "🙈" : "👁"}</button>
              </div>
              {errors.password && <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#DC2626" }}>{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%", padding: "0.9rem",
                background: isLoading
                  ? "rgba(99,102,241,0.4)"
                  : "linear-gradient(135deg, #6366F1, #4338CA)",
                color: "#fff", border: "none",
                borderRadius: "10px", fontSize: "1rem",
                fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: isLoading ? "none" : "0 6px 20px rgba(99,102,241,0.35)",
                transition: "all 0.2s",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: "8px",
              }}
              onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(99,102,241,0.45)"; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = isLoading ? "none" : "0 6px 20px rgba(99,102,241,0.35)"; }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: "16px", height: "16px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Signing in...
                </>
              ) : `Sign in as ${selectedRole === "manager" ? "Manager" : "Admin"}`}
            </button>
          </form>

          <p style={{
            textAlign: "center", fontSize: "0.82rem",
            color: "rgba(67,56,202,0.5)", marginTop: "1.8rem",
          }}>
            Not staff?{" "}
            <Link to="/login" style={{ color: "#6366F1", fontWeight: 500, textDecoration: "none" }}>
              Customer login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
