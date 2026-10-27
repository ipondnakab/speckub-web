import { injectSpeedInsights } from "@vercel/speed-insights";
import homeContent from "./home.html?raw";
import "./site.css";
import { header, footer, installCopyButtons } from "./site";

injectSpeedInsights();
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `${header("home")}
${homeContent}${footer}`;
installCopyButtons(app);
