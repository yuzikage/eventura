import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';
import { useFonts } from "../../hooks/useFonts";

const INPUT_STYLE = (hasError) => ({
  width: "100%", padding: "0.8rem 1rem",
  border: hasError ? "1.5px solid #DC2626" : "1.5px solid rgba(217,119,6,0.25)",
  borderRadius: "10px", fontSize: "0.95rem",
  fontFamily: "'DM Sans', sans-serif",
  background: "#fff", color: "#1C0A00",
  outline: "none", transition: "border 0.2s",
  boxSizing: "border-box",
});

const LABEL_STYLE = {
  display: "block", fontSize: "0.82rem",
  fontWeight: 500, color: "#3D1A00",
  marginBottom: "0.5rem", letterSpacing: "0.03em",
};

const ERROR_STYLE = {
  margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#DC2626",
};

export default function Signup() {
  useFonts();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const passwordValue = watch("password");

  const onSubmit = async (data) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await authApi.signup({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
      });
      // Signup returns { token, user } — log the user in immediately
      login(res);
      navigate("/dashboard");
    } catch (err) {
      if (err.status === 409) {
        setApiError("An account with this email already exists. Try logging in instead.");
      } else if (err.status === 400 && err.messages) {
        // Flatten validation messages from the API into a readable string
        const msgs = Object.values(err.messages).flat().join(" · ");
        setApiError(msgs);
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

      {/* Left panel */}
      <div style={{
        position: "relative",
        background: "linear-gradient(160deg, #1C0A00 0%, #3D1A00 60%, #2D0E00 100%)",
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        padding: "3rem", overflow: "hidden",
      }} className="auth-left-panel">

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

        {["✦", "❋", "✦", "❋", "✦"].map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${15 + i * 16}%`,
            left: `${10 + (i % 3) * 25}%`,
            fontSize: `${12 + i * 4}px`,
            color: "#F59E0B", opacity: 0.08 + i * 0.04,
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

        {/* Steps preview */}
        <div style={{ zIndex: 1 }}>
          <div style={{
            width: "48px", height: "3px",
            background: "linear-gradient(to right, #F59E0B, transparent)",
            marginBottom: "1.5rem",
          }} />
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.1rem", color: "rgba(255,251,235,0.5)",
            fontWeight: 400, margin: "0 0 1.8rem",
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            What happens next
          </p>
          {[
            { n: "1", t: "Create your account", d: "Just your name, email and password" },
            { n: "2", t: "Browse venues & themes", d: "Pick from our curated catalog" },
            { n: "3", t: "Get a live quote", d: "See your full price breakdown instantly" },
            { n: "4", t: "Meet your manager", d: "Schedule a consultation and confirm" },
          ].map((s) => (
            <div key={s.n} style={{
              display: "flex", gap: "1rem",
              alignItems: "flex-start", marginBottom: "1.2rem",
            }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "0.9rem", fontWeight: 700, color: "#F59E0B",
              }}>{s.n}</div>
              <div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.88rem", fontWeight: 500,
                  color: "#FFFBEB", marginBottom: "2px",
                }}>{s.t}</div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.78rem", color: "rgba(255,251,235,0.4)",
                  fontWeight: 300,
                }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          zIndex: 1, fontSize: "0.75rem",
          color: "rgba(255,251,235,0.25)", letterSpacing: "0.06em",
        }}>
          © 2026 Eventura · Coochbehar
        </div>

        <style>{`
          @keyframes floatOrn {
            0%,100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(15deg); }
          }
          @keyframes spin { to { transform: rotate(360deg); } }
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
        overflowY: "auto",
      }}>
        <div style={{ width: "100%", maxWidth: "420px", padding: "1rem 0" }}>

          {/* Header */}
          <div style={{ marginBottom: "2rem" }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              fontWeight: 700, color: "#1C0A00",
              margin: "0 0 0.5rem", lineHeight: 1.1,
            }}>
              Create your account
            </h1>
            <p style={{
              fontSize: "0.92rem", color: "#78350F",
              margin: 0, fontWeight: 300,
            }}>
              Start planning your perfect event today
            </p>
          </div>

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

            {/* Full name */}
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={LABEL_STYLE}>Full name</label>
              <input
                type="text"
                placeholder="Your full name"
                {...register("name", {
                  required: "Name is required",
                  minLength: { value: 2, message: "Name must be at least 2 characters" },
                })}
                style={INPUT_STYLE(errors.name)}
                onFocus={e => e.target.style.border = "1.5px solid #F59E0B"}
                onBlur={e => e.target.style.border = errors.name ? "1.5px solid #DC2626" : "1.5px solid rgba(217,119,6,0.25)"}
              />
              {errors.name && <p style={ERROR_STYLE}>{errors.name.message}</p>}
            </div>

            {/* Phone */}
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={LABEL_STYLE}>Phone number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                {...register("phone", {
                  required: "Phone number is required",
                  pattern: { value: /^[6-9]\d{9}$/, message: "Enter a valid 10-digit Indian mobile number" },
                })}
                style={INPUT_STYLE(errors.phone)}
                onFocus={e => e.target.style.border = "1.5px solid #F59E0B"}
                onBlur={e => e.target.style.border = errors.phone ? "1.5px solid #DC2626" : "1.5px solid rgba(217,119,6,0.25)"}
              />
              {errors.phone && <p style={ERROR_STYLE}>{errors.phone.message}</p>}
            </div>

            {/* Email */}
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={LABEL_STYLE}>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
                })}
                style={INPUT_STYLE(errors.email)}
                onFocus={e => e.target.style.border = "1.5px solid #F59E0B"}
                onBlur={e => e.target.style.border = errors.email ? "1.5px solid #DC2626" : "1.5px solid rgba(217,119,6,0.25)"}
              />
              {errors.email && <p style={ERROR_STYLE}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={LABEL_STYLE}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "Minimum 6 characters" },
                  })}
                  style={INPUT_STYLE(errors.password)}
                  onFocus={e => e.target.style.border = "1.5px solid #F59E0B"}
                  onBlur={e => e.target.style.border = errors.password ? "1.5px solid #DC2626" : "1.5px solid rgba(217,119,6,0.25)"}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: "absolute", right: "0.9rem", top: "50%",
                  transform: "translateY(-50%)", background: "none",
                  border: "none", cursor: "pointer", fontSize: "1rem",
                  color: "#92400E", padding: 0,
                }}>
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              {errors.password && <p style={ERROR_STYLE}>{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: "1.8rem" }}>
              <label style={LABEL_STYLE}>Confirm password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your password"
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (val) => val === passwordValue || "Passwords do not match",
                  })}
                  style={INPUT_STYLE(errors.confirmPassword)}
                  onFocus={e => e.target.style.border = "1.5px solid #F59E0B"}
                  onBlur={e => e.target.style.border = errors.confirmPassword ? "1.5px solid #DC2626" : "1.5px solid rgba(217,119,6,0.25)"}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                  position: "absolute", right: "0.9rem", top: "50%",
                  transform: "translateY(-50%)", background: "none",
                  border: "none", cursor: "pointer", fontSize: "1rem",
                  color: "#92400E", padding: 0,
                }}>
                  {showConfirm ? "🙈" : "👁"}
                </button>
              </div>
              {errors.confirmPassword && <p style={ERROR_STYLE}>{errors.confirmPassword.message}</p>}
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
                    borderTopColor: "#1C1917", borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Creating account...
                </>
              ) : "Create Account"}
            </button>
          </form>

          {/* Login link */}
          <p style={{
            textAlign: "center", fontSize: "0.9rem",
            color: "#78350F", marginTop: "1.8rem",
          }}>
            Already have an account?{" "}
            <Link to="/login" style={{
              color: "#D97706", fontWeight: 500, textDecoration: "none",
            }}
              onMouseEnter={e => e.target.style.textDecoration = "underline"}
              onMouseLeave={e => e.target.style.textDecoration = "none"}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
