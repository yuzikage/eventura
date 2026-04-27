import { useEffect } from "react";

export function useFonts() {
  useEffect(() => {
    if (document.getElementById("gf-eventura")) return;
    const link = document.createElement("link");
    link.id = "gf-eventura";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap";
    document.head.appendChild(link);
  }, []);
}