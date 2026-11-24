// Theme ki list (swatch ke liye do rang: main rang aur tumhare message ka rang)
export const PALETTES = [
  { id: "lagoon", name: "Lagoon", colors: ["#14695e", "#f7c948"] },
  { id: "ocean", name: "Ocean", colors: ["#2159c4", "#a9c6ff"] },
  { id: "plum", name: "Plum", colors: ["#6f3295", "#f4a8cb"] },
  { id: "graphite", name: "Graphite", colors: ["#3f4b5c", "#bfe3d0"] },
];

export const applyPalette = (id) => {
  document.documentElement.dataset.palette = id;
  try {
    localStorage.setItem("palette", id);
  } catch {}
};
