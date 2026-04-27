import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { themesApi, packagesApi } from "../../services/api";
import { useFonts } from "../../hooks/useFonts";

const C = {
  bg: "#F0F4F4", dark: "#0F2830", mid: "#0D9488",
  accent: "#14B8A6", accentLt: "rgba(20,184,166,0.1)",
  border: "rgba(13,148,136,0.15)", muted: "rgba(15,40,48,0.45)",
};

const PACKAGE_TYPES = ["event", "photography", "catering"];
const TABS          = ["themes", "packages"];

const EMPTY_THEME   = { name: "", description: "", images: ["", "", ""], is_active: true };
const EMPTY_PACKAGE = { label: "", price: "", type: "event", is_active: true, features: "" };

// Map local type key → packagesApi sub-object
const PKG_API = {
  event:       packagesApi.events,
  photography: packagesApi.photography,
  catering:    packagesApi.catering,
};

const INPUT_STYLE = {
  width: "100%", padding: "0.7rem 1rem",
  border: `1.5px solid ${C.border}`, borderRadius: "10px",
  fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif",
  color: C.dark, background: "#ebfff9",
  outline: "none", boxSizing: "border-box", transition: "border 0.2s",
};
const LABEL_STYLE = {
  display: "block", fontSize: "0.78rem", fontWeight: 500,
  color: C.dark, marginBottom: "0.4rem", letterSpacing: "0.03em",
};

function Skeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: "200px", borderRadius: "14px", background: C.accentLt, animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i*0.1}s` }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

export default function ContentManagement() {
  useFonts();
  const navigate = useNavigate();

  const [tab,          setTab]          = useState("themes");
  const [themes,       setThemes]       = useState([]);
  const [packages,     setPackages]     = useState({ event: [], photography: [], catering: [] });
  const [pkgFilter,    setPkgFilter]    = useState("event");
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null); // null | "theme" | "package"
  const [editId,       setEditId]       = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [formError,    setFormError]    = useState(null);
  const [deleteConfirm,setDeleteConfirm]= useState(null); // { id, type, name }
  const [deleting,     setDeleting]     = useState(false);

  const [themeForm,   setThemeForm]   = useState(EMPTY_THEME);
  const [packageForm, setPackageForm] = useState(EMPTY_PACKAGE);

  // Initial load: themes + all 3 package types in parallel
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [themesRes, eventsRes, photoRes, cateringRes] = await Promise.all([
          themesApi.listAll(),
          packagesApi.events.list(),
          packagesApi.photography.list(),
          packagesApi.catering.list(),
        ]);
        setThemes(themesRes.themes || []);
        setPackages({
          event:       eventsRes.packages   || [],
          photography: photoRes.packages    || [],
          catering:    cateringRes.packages || [],
        });
      } catch {
        // leave defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Themes

  const openThemeAdd = () => {
    setThemeForm(EMPTY_THEME);
    setEditId(null);
    setFormError(null);
    setSaved(false);
    setModal("theme");
  };

  const openThemeEdit = (t) => {
    setThemeForm({
      name:        t.name,
      description: t.description || "",
      images:      t.images?.length ? [...t.images, "", ""].slice(0, 3) : ["", "", ""],
      is_active:   t.is_active,
    });
    setEditId(t.id);
    setFormError(null);
    setSaved(false);
    setModal("theme");
  };

  const saveTheme = async () => {
    if (!themeForm.name) { setFormError("Theme name is required."); return; }
    setSaving(true);
    setFormError(null);
    try {
      const cleanImages = themeForm.images.filter(u => u.trim() !== "");
      const body = {
        name:        themeForm.name,
        description: themeForm.description,
        images:      cleanImages,
        is_active:   themeForm.is_active,
      };
      if (editId) {
        const updated = await themesApi.update(editId, body);
        setThemes(prev => prev.map(t => t.id === editId ? updated : t));
      } else {
        const created = await themesApi.create(body);
        setThemes(prev => [...prev, created]);
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); setModal(null); }, 900);
    } catch (err) {
      setFormError(err.message || "Failed to save theme.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle theme visibility inline (PUT with flipped is_active)
  const toggleTheme = async (t) => {
    setThemes(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
    try {
      await themesApi.update(t.id, { name: t.name, description: t.description, images: t.images, is_active: !t.is_active });
    } catch {
      setThemes(prev => prev.map(x => x.id === t.id ? { ...x, is_active: t.is_active } : x));
    }
  };

  // Packages

  const openPkgAdd = () => {
    setPackageForm({ ...EMPTY_PACKAGE, type: pkgFilter });
    setEditId(null);
    setFormError(null);
    setSaved(false);
    setModal("package");
  };

  const openPkgEdit = (p, type) => {
    // Catering uses price_per_head, others use price
    const price = type === "catering" ? p.price_per_head : p.price;
    setPackageForm({
      label:     p.label,
      price:     price,
      type:      type,
      is_active: p.is_active,
      features:  (p.features || []).join("\n"),
    });
    setEditId(p.id);
    setFormError(null);
    setSaved(false);
    setModal("package");
  };

  const savePkg = async () => {
    if (!packageForm.label || !packageForm.price) { setFormError("Name and price are required."); return; }
    setSaving(true);
    setFormError(null);
    try {
      const features = packageForm.features.split("\n").map(s => s.trim()).filter(Boolean);
      const isCatering = packageForm.type === "catering";
      const body = {
        label:     packageForm.label,
        features,
        is_active: packageForm.is_active,
        ...(isCatering
          ? { price_per_head: Number(packageForm.price) }
          : { price: Number(packageForm.price) }
        ),
      };
      const api = PKG_API[packageForm.type];
      let result;
      if (editId) {
        result = await api.update(editId, body);
        setPackages(prev => ({
          ...prev,
          [packageForm.type]: prev[packageForm.type].map(p => p.id === editId ? result : p),
        }));
      } else {
        result = await api.create(body);
        setPackages(prev => ({
          ...prev,
          [packageForm.type]: [...prev[packageForm.type], result],
        }));
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); setModal(null); }, 900);
    } catch (err) {
      setFormError(err.message || "Failed to save package.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle package visibility inline
  const togglePkg = async (p, type) => {
    setPackages(prev => ({
      ...prev,
      [type]: prev[type].map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x),
    }));
    try {
      const isCatering = type === "catering";
      await PKG_API[type].update(p.id, {
        label:     p.label,
        features:  p.features,
        is_active: !p.is_active,
        ...(isCatering ? { price_per_head: p.price_per_head } : { price: p.price }),
      });
    } catch {
      setPackages(prev => ({
        ...prev,
        [type]: prev[type].map(x => x.id === p.id ? { ...x, is_active: p.is_active } : x),
      }));
    }
  };

  // Delete theme or package after confirming in modal

  const deleteItem = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      if (deleteConfirm.type === "theme") {
        await themesApi.delete(deleteConfirm.id);
        setThemes(prev => prev.filter(t => t.id !== deleteConfirm.id));
      } else {
        await PKG_API[deleteConfirm.pkgType].delete(deleteConfirm.id);
        setPackages(prev => ({
          ...prev,
          [deleteConfirm.pkgType]: prev[deleteConfirm.pkgType].filter(p => p.id !== deleteConfirm.id),
        }));
      }
      setDeleteConfirm(null);
    } catch {
      // leave modal open
    } finally {
      setDeleting(false);
    }
  };

  // Filtered list of packages to show based on selected type tab

  const filteredPkgs = packages[pkgFilter] || [];

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
        <div style={{ marginBottom: "2rem" }}>
          <span style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.mid, fontWeight: 500 }}>Admin</span>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 700, color: C.dark, margin: "0.3rem 0 0.3rem", lineHeight: 1.1 }}>Content Management</h1>
          <p style={{ fontSize: "0.88rem", color: C.muted, margin: 0, fontWeight: 300 }}>Manage themes and packages shown to customers during event planning.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", borderBottom: `1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "0.6rem 1.4rem", border: "none", borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent", background: "transparent", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: tab === t ? 500 : 400, color: tab === t ? C.mid : C.muted, transition: "all 0.2s", textTransform: "capitalize", marginBottom: "-1px" }}>{t}</button>
          ))}
        </div>

        {/* Themes Tab */}
        {tab === "themes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.2rem" }}>
              <button onClick={openThemeAdd} style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)", color: "#1C1917", border: "none", borderRadius: "100px", padding: "0.6rem 1.3rem", fontWeight: 500, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 4px 14px rgba(20,184,166,0.1)", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(20,184,166,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 14px rgba(20,184,166,0.2)"; }}
              >+ Add Theme</button>
            </div>
            {loading ? <Skeleton /> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
                {themes.map(t => (
                  <div key={t.id} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "14px", overflow: "hidden", opacity: t.is_active ? 1 : 0.6, transition: "opacity 0.2s", boxShadow: "0 2px 8px rgba(28,10,0,0.04)" }}>
                    <div style={{ width: "100%", height: "110px", overflow: "hidden", position: "relative", background: "rgba(217,119,6,0.08)" }}>
                      {t.images?.[0] ? (
                        <img src={t.images[0]} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>🎨</div>
                      )}
                      <div style={{ position: "absolute", bottom: "6px", right: "6px", background: "rgba(15,5,0,0.55)", color: "#fff", fontSize: "0.6rem", padding: "2px 6px", borderRadius: "100px" }}>
                        {t.images?.length || 0} photos
                      </div>
                    </div>
                    <div style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 700, color: C.dark }}>{t.name}</span>
                        <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.55rem", borderRadius: "100px", fontWeight: 500, background: t.is_active ? "rgba(5,150,105,0.1)" : "rgba(120,53,15,0.1)", color: t.is_active ? "#065F46" : C.muted }}>
                          {t.is_active ? "Visible" : "Hidden"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: C.muted, fontWeight: 300, marginBottom: "1rem", lineHeight: 1.4 }}>{t.description}</div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button onClick={() => openThemeEdit(t)} style={{ flex: 1, padding: "0.45rem", background: C.accentLt, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.mid, fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Edit</button>
                        <button onClick={() => toggleTheme(t)} style={{ flex: 1, padding: "0.45rem", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "8px", color: C.muted, fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{t.is_active ? "Hide" : "Show"}</button>
                        <button onClick={() => setDeleteConfirm({ id: t.id, type: "theme", name: t.name })} style={{ padding: "0.45rem 0.7rem", background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "8px", color: "#991B1B", fontSize: "0.75rem", cursor: "pointer" }}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
                {themes.length === 0 && !loading && (
                  <div style={{ gridColumn: "1/-1", padding: "3rem", textAlign: "center", background: "#fff", border: `1.5px dashed ${C.border}`, borderRadius: "14px" }}>
                    <p style={{ color: C.muted, margin: 0 }}>No themes yet. Add your first theme.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Packages Tab */}
        {tab === "packages" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {PACKAGE_TYPES.map(t => (
                  <button key={t} onClick={() => setPkgFilter(t)} style={{ padding: "0.4rem 1rem", border: `1.5px solid ${pkgFilter === t ? C.accent : C.border}`, borderRadius: "100px", background: pkgFilter === t ? C.accentLt : "#fff", color: pkgFilter === t ? C.mid : C.muted, fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", fontWeight: pkgFilter === t ? 500 : 400, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s" }}>{t}</button>
                ))}
              </div>
              <button onClick={openPkgAdd} style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)", color: "#1C1917", border: "none", borderRadius: "100px", padding: "0.6rem 1.3rem", fontWeight: 500, fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 4px 14px rgba(20,184,166,0.1)", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(20,184,166,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 14px rgba(20,184,166,0.2)"; }}
              >+ Add Package</button>
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>{[1,2,3].map(i => <div key={i} style={{ height: "72px", borderRadius: "14px", background: C.accentLt, animation: "pulse 1.4s ease-in-out infinite" }} />)}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {filteredPkgs.map(p => {
                  const isCatering = pkgFilter === "catering";
                  const displayPrice = isCatering ? p.price_per_head : p.price;
                  return (
                    <div key={p.id} style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: "14px", padding: "1.1rem 1.3rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", opacity: p.is_active ? 1 : 0.6 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem", fontWeight: 700, color: C.dark }}>{p.label}</span>
                          <span style={{ fontSize: "0.68rem", padding: "0.12rem 0.5rem", borderRadius: "100px", fontWeight: 500, background: p.is_active ? "rgba(5,150,105,0.1)" : "rgba(120,53,15,0.1)", color: p.is_active ? "#065F46" : C.muted }}>
                            {p.is_active ? "Active" : "Hidden"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: C.muted, fontWeight: 300 }}>
                          {(p.features || []).slice(0, 3).join(" · ")}{(p.features?.length || 0) > 3 ? ` +${p.features.length - 3} more` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", fontWeight: 700, color: C.mid }}>₹{Number(displayPrice).toLocaleString("en-IN")}</div>
                          <div style={{ fontSize: "0.7rem", color: C.muted }}>{isCatering ? "per head" : "flat rate"}</div>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button onClick={() => openPkgEdit(p, pkgFilter)} style={{ padding: "0.4rem 0.7rem", background: C.accentLt, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.mid, fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Edit</button>
                          <button onClick={() => togglePkg(p, pkgFilter)} style={{ padding: "0.4rem 0.7rem", background: "transparent", border: `1px solid ${C.border}`, borderRadius: "8px", color: C.muted, fontSize: "0.75rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{p.is_active ? "Hide" : "Show"}</button>
                          <button onClick={() => setDeleteConfirm({ id: p.id, type: "package", pkgType: pkgFilter, name: p.label })} style={{ padding: "0.4rem 0.6rem", background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "8px", color: "#991B1B", fontSize: "0.75rem", cursor: "pointer" }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredPkgs.length === 0 && (
                  <div style={{ padding: "3rem", textAlign: "center", background: "#fff", border: `1.5px dashed ${C.border}`, borderRadius: "14px" }}>
                    <p style={{ color: C.muted, margin: 0 }}>No {pkgFilter} packages yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Theme Modal */}
      {modal === "theme" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(28,10,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "2rem", width: "100%", maxWidth: "460px", boxShadow: "0 20px 60px rgba(28,10,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 700, color: C.dark, margin: "0 0 1.5rem" }}>
              {editId ? "Edit Theme" : "Add New Theme"}
            </h2>
            {formError && <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "10px", padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#DC2626" }}>⚠️ {formError}</div>}
            {[
              { label: "Theme Name",  key: "name",        placeholder: "e.g. Royal Marigold" },
              { label: "Description", key: "description", placeholder: "Short description" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "1rem" }}>
                <label style={LABEL_STYLE}>{f.label}</label>
                <input placeholder={f.placeholder} value={themeForm[f.key]} onChange={e => setThemeForm(p => ({ ...p, [f.key]: e.target.value }))} style={INPUT_STYLE} onFocus={e => e.target.style.border = `1.5px solid ${C.accent}`} onBlur={e => e.target.style.border = `1.5px solid ${C.border}`} />
              </div>
            ))}
            <div style={{ marginBottom: "1rem" }}>
              <label style={LABEL_STYLE}>Theme Images (up to 3 URLs)</label>
              {[0, 1, 2].map(i => (
                <input key={i} type="url" placeholder={`Image ${i + 1} URL`} value={themeForm.images?.[i] || ""} onChange={e => { const imgs = [...(themeForm.images || ["","",""])]; imgs[i] = e.target.value; setThemeForm(p => ({ ...p, images: imgs })); }} style={{ ...INPUT_STYLE, marginBottom: i < 2 ? "0.5rem" : 0 }} onFocus={e => e.target.style.border = `1.5px solid ${C.accent}`} onBlur={e => e.target.style.border = `1.5px solid ${C.border}`} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 500, color: C.dark }}>Visible to customers</span>
              <div onClick={() => setThemeForm(p => ({ ...p, is_active: !p.is_active }))} style={{ width: "44px", height: "24px", borderRadius: "100px", background: themeForm.is_active ? "#10B981" : "rgba(120,53,15,0.2)", position: "relative", cursor: "pointer", transition: "background 0.3s" }}>
                <div style={{ position: "absolute", top: "3px", left: themeForm.is_active ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={saveTheme} disabled={saving} style={{ flex: 1, padding: "0.8rem", background: saved ? "rgba(5,150,105,0.15)" : saving ? "rgba(20,184,166,0.3)" : "linear-gradient(135deg, #14B8A6, #0D9488)", border: saved ? "1px solid #10B981" : "none", color: saved ? "#065F46" : "#1C1917", borderRadius: "10px", fontWeight: 500, fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving..." : saved ? "✓ Saved" : editId ? "Save Changes" : "Add Theme"}
              </button>
              <button onClick={() => setModal(null)} style={{ padding: "0.8rem 1.2rem", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: "10px", color: C.muted, fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Package Modal */}
      {modal === "package" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(28,10,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{ background: "#fff", borderRadius: "20px", padding: "2rem", width: "100%", maxWidth: "460px", boxShadow: "0 20px 60px rgba(28,10,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 700, color: C.dark, margin: "0 0 1.5rem" }}>
              {editId ? "Edit Package" : "Add New Package"}
            </h2>
            {formError && <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "10px", padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#DC2626" }}>⚠️ {formError}</div>}
            <div style={{ marginBottom: "1rem" }}>
              <label style={LABEL_STYLE}>Package Name</label>
              <input placeholder="e.g. Premium" value={packageForm.label} onChange={e => setPackageForm(p => ({ ...p, label: e.target.value }))} style={INPUT_STYLE} onFocus={e => e.target.style.border = `1.5px solid ${C.accent}`} onBlur={e => e.target.style.border = `1.5px solid ${C.border}`} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <label style={LABEL_STYLE}>{packageForm.type === "catering" ? "Price per head (₹)" : "Price (₹)"}</label>
                <input type="number" placeholder="e.g. 35000" value={packageForm.price} onChange={e => setPackageForm(p => ({ ...p, price: e.target.value }))} style={INPUT_STYLE} onFocus={e => e.target.style.border = `1.5px solid ${C.accent}`} onBlur={e => e.target.style.border = `1.5px solid ${C.border}`} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Package Type</label>
                <select value={packageForm.type} onChange={e => setPackageForm(p => ({ ...p, type: e.target.value }))} disabled={!!editId} style={{ ...INPUT_STYLE, cursor: editId ? "not-allowed" : "pointer", opacity: editId ? 0.6 : 1 }}>
                  {PACKAGE_TYPES.map(t => <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={LABEL_STYLE}>Features (one per line)</label>
              <textarea placeholder={"Premium floral décor\n2 coordinators\nDesigner lighting"} value={packageForm.features} onChange={e => setPackageForm(p => ({ ...p, features: e.target.value }))} rows={4} style={{ ...INPUT_STYLE, resize: "vertical" }} onFocus={e => e.target.style.border = `1.5px solid ${C.accent}`} onBlur={e => e.target.style.border = `1.5px solid ${C.border}`} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 500, color: C.dark }}>Active / visible to customers</span>
              <div onClick={() => setPackageForm(p => ({ ...p, is_active: !p.is_active }))} style={{ width: "44px", height: "24px", borderRadius: "100px", background: packageForm.is_active ? "#10B981" : "rgba(120,53,15,0.2)", position: "relative", cursor: "pointer", transition: "background 0.3s" }}>
                <div style={{ position: "absolute", top: "3px", left: packageForm.is_active ? "23px" : "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#fff", transition: "left 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={savePkg} disabled={saving} style={{ flex: 1, padding: "0.8rem", background: saved ? "rgba(5,150,105,0.15)" : saving ? "rgba(20,184,166,0.3)" : "linear-gradient(135deg, #14B8A6, #0D9488)", border: saved ? "1px solid #10B981" : "none", color: saved ? "#065F46" : "#1C1917", borderRadius: "10px", fontWeight: 500, fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving..." : saved ? "✓ Saved" : editId ? "Save Changes" : "Add Package"}
              </button>
              <button onClick={() => setModal(null)} style={{ padding: "0.8rem 1.2rem", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: "10px", color: C.muted, fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(28,10,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "1.8rem", maxWidth: "360px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🗑</div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 700, color: C.dark, margin: "0 0 0.5rem" }}>Delete "{deleteConfirm.name}"?</h3>
            <p style={{ fontSize: "0.85rem", color: C.muted, margin: "0 0 1.5rem", fontWeight: 300 }}>This will remove it from the customer-facing catalog immediately.</p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={deleteItem} disabled={deleting} style={{ flex: 1, padding: "0.75rem", background: "#EF4444", border: "none", borderRadius: "10px", color: "#fff", fontWeight: 500, fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1 }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "0.75rem", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: "10px", color: C.muted, fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
