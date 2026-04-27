export const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const fmtApiDate = (s) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};