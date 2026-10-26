// Shared App Logic for Multi-IP Multi-Port Static Demo
const FLAVORS = [
  { id: 1, name: "Crimson Solaris", defaultIp: "192.168.0.101", port: 9001, theme: "flavor-1", color: "#ff3366" },
  { id: 2, name: "Cyber Azure", defaultIp: "192.168.0.102", port: 9002, theme: "flavor-2", color: "#00d2ff" },
  { id: 3, name: "Emerald Aurora", defaultIp: "192.168.0.103", port: 9003, theme: "flavor-3", color: "#10b981" },
  { id: 4, name: "Neon Amethyst", defaultIp: "192.168.0.104", port: 9004, theme: "flavor-4", color: "#a855f7" },
  { id: 5, name: "Solar Amber", defaultIp: "192.168.0.106", port: 9005, theme: "flavor-5", color: "#f59e0b" }
];

document.addEventListener("DOMContentLoaded", () => {
  initClock();
  initCopyButtons();
  initFlavorNav();
  checkApiDiagnostics();
});

// Live clock
function initClock() {
  const clockEl = document.getElementById("live-clock");
  if (!clockEl) return;

  function update() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString();
  }
  update();
  setInterval(update, 1000);
}

// Interactive navigation tabs
let currentNavMode = 'lan'; // 'lan' or 'localhost'

function initFlavorNav() {
  const container = document.getElementById("flavor-nav-grid");
  const currentFlavorId = parseInt(document.body.dataset.flavorId || "1", 10);
  
  window.setNavMode = function(mode) {
    currentNavMode = mode;
    document.querySelectorAll(".control-btn").forEach(b => b.classList.remove("active"));
    const activeBtn = document.getElementById(`btn-mode-${mode}`);
    if (activeBtn) activeBtn.classList.add("active");
    renderNav();
  };

  function renderNav() {
    if (!container) return;
    container.innerHTML = "";

    FLAVORS.forEach(f => {
      const a = document.createElement("a");
      a.className = `flavor-btn ${f.id === currentFlavorId ? 'active' : ''}`;
      
      const targetHost = currentNavMode === 'lan' ? f.defaultIp : 'localhost';
      a.href = `http://${targetHost}:${f.port}/`;

      a.innerHTML = `
        <span class="flavor-badge-num">FLAVOR 0${f.id}</span>
        <span class="flavor-btn-title">${f.name}</span>
        <span class="flavor-btn-ip">${targetHost}</span>
        <span class="flavor-btn-port">:${f.port}</span>
      `;
      container.appendChild(a);
    });
  }

  renderNav();
}

// Copy commands to clipboard
function initCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      const text = targetEl.innerText.replace(/^\$\s*/gm, '');
      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = "COPIED!";
        btn.style.color = "#10b981";
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.color = "";
        }, 2000);
      });
    });
  });
}

// Fetch diagnostics from /api/info
async function checkApiDiagnostics() {
  const latencyEl = document.getElementById("metric-latency");
  const clientIpEl = document.getElementById("metric-client-ip");
  const serverTimeEl = document.getElementById("metric-server-time");
  const headersLogEl = document.getElementById("headers-log");
  const activeHostEl = document.getElementById("metric-accessed-via");

  if (activeHostEl) {
    activeHostEl.textContent = window.location.host || "Local Host";
  }

  const startTime = performance.now();
  try {
    const res = await fetch("/api/info", { cache: "no-store" });
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    if (latencyEl) latencyEl.textContent = `${duration} ms`;

    if (res.ok) {
      const data = await res.json();
      if (clientIpEl && data.clientIp) {
        clientIpEl.textContent = data.clientIp;
      }
      if (serverTimeEl && data.timestamp) {
        serverTimeEl.textContent = new Date(data.timestamp).toLocaleTimeString();
      }
      if (headersLogEl && data.headers) {
        headersLogEl.innerHTML = `<span class="terminal-comment"># Nginx Forwarded Request Headers:</span>\n` +
          Object.entries(data.headers)
            .map(([k, v]) => `<span class="terminal-highlight">${k}:</span> ${v}`)
            .join("\n");
      }
    }
  } catch (e) {
    if (latencyEl) latencyEl.textContent = "Static Mode";
    if (clientIpEl) clientIpEl.textContent = window.location.hostname;
    if (headersLogEl) {
      headersLogEl.innerHTML = `<span class="terminal-comment"># Served as pure static page via Web Server\n# Direct File delivery active</span>`;
    }
  }
}
