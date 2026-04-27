import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { venuesApi } from "../../services/api";
import { useFonts } from "../../hooks/useFonts";

const C = {
  bg: "#F0F4F4", dark: "#0F2830", mid: "#0D9488",
  accent: "#14B8A6", accentLt: "rgba(20,184,166,0.1)",
  border: "rgba(13,148,136,0.15)", muted: "rgba(15,40,48,0.45)",
};

const EMPTY_FORM = { name: "", location: "", capacity: "", price: "", is_available: true };

const INPUT = (hasErr) => ({
  width: "100%", padding: "0.7rem 1rem",
  border: `1.5px solid ${hasErr ? "#DC2626" : C.border}`,
  borderRadius: "10px", fontSize: "0.9rem",
  fontFamily: "'DM Sans', sans-serif",
  color: C.dark, background: "#ebfff9",
  outline: "none", boxSizing: "border-box",
  transition: "border 0.2s",
});

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: "90px", borderRadius: "16px", background: C.accentLt, animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i*0.1}s` }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

export default function VenueManagement() {
  useFonts();
  const navigate = useNavigate();

  const [venues,        setVenues]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [editTarget,    setEditTarget]    = useState(null); // venue object being edited
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [formError,     setFormError]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // venue id
  const [deleting,      setDeleting]      = useState(false);
  const [pageError,     setPageError]     = useState(null);

  // Load all venues (admin sees unavailable ones too)
  const loadVenues = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const res = await venuesApi.listAll();
      setVenues(res.venues || []);
    } catch {
      setPageError("Could not load venues. Please refresh.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadVenues(); }, []);

  // Open add modal
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setFormError(null);
    setSaved(false);
    setShowModal(true);
  };

  // Open edit modal
  const openEdit = (v) => {
    setForm({
      name:         v.name,
      location:     v.location,
      capacity:     v.capacity,
      price:        v.price,
      is_available: v.is_available,
    });
    setEditTarget(v);
    setFormError(null);
    setSaved(false);
    setShowModal(true);
  };

  // Toggle availability inline (PUT)
  const toggleAvailability = async (v) => {
    // Optimistic update
    setVenues(prev => prev.map(x => x.id === v.id ? { ...x, is_available: !x.is_available } : x));
    try {
      await venuesApi.update(v.id, {
        name:         v.name,
        location:     v.location,
        capacity:     v.capacity,
        price:        v.price,
        is_available: !v.is_available,
      });
    } catch {
      // Revert on failure
      setVenues(prev => prev.map(x => x.id === v.id ? { ...x, is_available: v.is_available } : x));
    }
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!form.name || !form.location || !form.capacity || !form.price) {
      setFormError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name:         form.name,
        location:     form.location,
        capacity:     Number(form.capacity),
        price:        Number(form.price),
        is_available: form.is_available,
      };
      if (editTarget) {
        const updated = await venuesApi.update(editTarget.id, body);
        setVenues(prev => prev.map(v => v.id === editTarget.id ? updated : v));
      } else {
        const created = await venuesApi.create(body);
        setVenues(prev => [...prev, created]);
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); setShowModal(false); }, 1000);
    } catch (err) {
      setFormError(err.message || "Failed to save venue. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await venuesApi.delete(deleteConfirm);
      setVenues(prev => prev.filter(v => v.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch {
      // leave modal open with no extra feedback — user can try again
    } finally {
      setDeleting(false);
    }
  };

  const availableCount = venues.filter(v => v.is_available).length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Topbar */}
      <div style={{ height: "60px", background: C.dark, display: "flex", alignItems: "center", padding: "0 2rem", justifyContent: "space-between", borderBottom: "1px solid rgba(245,158,11,0.15)", position: "sticky", top: 0, zIndex: 50 }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#F59E0B", fontSize: "20px" }}>✦</span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 700, color: "#FCD34D" }}>Eventura</span>
        </Link>
        <button onClick={() => navigate("/admin")} style={{ background: "transparent", border: "1px solid rgba(20,184,166,0.25)", color: "#0D9488", borderRadius: "100px", padding: "0.35rem 1rem", fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>← Admin Dashboard</button>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem clamp(1.5rem, 5vw, 3rem)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.mid, fontWeight: 500 }}>Admin</span>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 700, color: C.dark, margin: "0.3rem 0 0.3rem", lineHeight: 1.1 }}>Venue Management</h1>
            <p style={{ fontSize: "0.88rem", color: C.muted, margin: 0, fontWeight: 300 }}>
              {loading ? "Loading…" : `${availableCount} of ${venues.length} venues currently available`}
            </p>
          </div>
          <button onClick={openAdd} style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)", color: "#1C1917", border: "none", borderRadius: "100px", padding: "0.7rem 1.5rem", fontWeight: 500, fontSize: "0.88rem", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 4px 14px rgba(20,184,166,0.1)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(20,184,166,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 14px rgba(20,184,166,0.2)"; }}
          >+ Add Venue</button>
        </div>

        {/* Page error */}
        {pageError && (
          <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "12px", padding: "0.9rem 1.2rem", marginBottom: "1.5rem", fontSize: "0.88rem", color: "#DC2626" }}>
            ⚠️ {pageError}
          </div>
        )}

        {/* Venue cards */}
        {loading ? <Skeleton /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {venues.map(v => (
              <div key={v.id} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "16px", padding: "1.3rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", opacity: v.is_available ? 1 : 0.7, transition: "all 0.2s", boxShadow: "0 2px 8px rgba(28,10,0,0.04)" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", fontWeight: 700, color: C.dark }}>{v.name}</span>
                    <span style={{ fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", padding: "0.15rem 0.55rem", borderRadius: "100px", fontWeight: 500, background: v.is_available ? "rgba(5,150,105,0.1)" : "rgba(220,38,38,0.1)", color: v.is_available ? "#065F46" : "#991B1B" }}>
                      {v.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: C.muted, fontWeight: 300 }}>
                    📍 {v.location} · Up to {v.capacity} guests
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontWeight: 700, color: C.mid, marginTop: "4px" }}>
                    ₹{Number(v.price).toLocaleString("en-IN")} <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", fontWeight: 300, color: C.muted }}>per booking</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {/* Availability toggle */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", color: C.muted }}>Available</span>
                    <div onClick={() => toggleAvailability(v)} style={{ width: "44px", height: "24px", borderRadius: "100px", background: v.is_available ? "#10B981" : "rgba(120,53,15,0.2)", position: "relative", cursor: "pointer", transition: "background 0.3s" }}>
                      <div style={{ position: "absolute", top: "3px", left: v.is_available ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                  <button onClick={() => openEdit(v)} style={{ padding: "0.45rem 0.9rem", background: C.accentLt, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.mid, fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 500, cursor: "pointer" }}>Edit</button>
                  <button onClick={() => setDeleteConfirm(v.id)} style={{ padding: "0.45rem 0.9rem", background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "8px", color: "#991B1B", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 500, cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            ))}
            {venues.length === 0 && (
              <div style={{ padding: "3rem", textAlign: "center", background: "#fff", border: `1.5px dashed ${C.border}`, borderRadius: "16px" }}>
                <p style={{ color: C.muted, margin: 0 }}>No venues yet. Add your first venue above.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(28,10,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "2rem", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(28,10,0,0.3)" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 700, color: C.dark, margin: "0 0 1.5rem" }}>
              {editTarget ? "Edit Venue" : "Add New Venue"}
            </h2>

            {formError && (
              <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "10px", padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#DC2626" }}>
                ⚠️ {formError}
              </div>
            )}

            {[
              { label: "Venue Name", key: "name",     type: "text",   placeholder: "e.g. The Grand Pavilion" },
              { label: "Location",   key: "location", type: "text",   placeholder: "e.g. Coochbehar Central" },
              { label: "Capacity",   key: "capacity", type: "number", placeholder: "Max guests" },
              { label: "Price (₹)",  key: "price",    type: "number", placeholder: "e.g. 120000" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "1.1rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 500, color: C.dark, marginBottom: "0.4rem", letterSpacing: "0.03em" }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={INPUT(!form[f.key] && saving)}
                  onFocus={e => e.target.style.border = `1.5px solid ${C.accent}`}
                  onBlur={e => e.target.style.border = `1.5px solid ${C.border}`}
                />
              </div>
            ))}

            {/* Availability toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 500, color: C.dark }}>Available for booking</span>
              <div onClick={() => setForm(p => ({ ...p, is_available: !p.is_available }))} style={{ width: "44px", height: "24px", borderRadius: "100px", background: form.is_available ? "#10B981" : "rgba(120,53,15,0.2)", position: "relative", cursor: "pointer", transition: "background 0.3s" }}>
                <div style={{ position: "absolute", top: "3px", left: form.is_available ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "0.8rem", background: saved ? "rgba(5,150,105,0.15)" : saving ? "rgba(20,184,166,0.3)" : "linear-gradient(135deg, #14B8A6, #0D9488)", border: saved ? "1px solid #10B981" : "none", color: saved ? "#065F46" : "#1C1917", borderRadius: "10px", fontWeight: 500, fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                {saving ? <><span style={{ width: "14px", height: "14px", border: "2px solid rgba(28,25,23,0.3)", borderTopColor: "#1C1917", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Saving...</> : saved ? "✓ Saved" : editTarget ? "Save Changes" : "Add Venue"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ padding: "0.8rem 1.2rem", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: "10px", color: C.muted, fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(28,10,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "1.8rem", maxWidth: "360px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🗑</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 700, color: C.dark, margin: "0 0 0.5rem" }}>Delete Venue?</h3>
            <p style={{ fontSize: "0.85rem", color: C.muted, margin: "0 0 1.5rem", fontWeight: 300 }}>This action cannot be undone. The venue will be removed from all future booking options.</p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "0.75rem", background: "#EF4444", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 500, fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "0.75rem", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: "10px", color: C.muted, fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
