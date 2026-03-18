import { useState, useEffect, useMemo } from "react";

// ============================================================
// TINTORERÍA HERNÁNDEZ - Sistema de Gestión
// ============================================================

const SERVICE_TYPES = [
  "Sillones", "Alfombras", "Alfombras domicilio", "Oficinas",
  "Sillas", "Sillas oficina", "Colchón 1 plaza", "Colchón 1½ plaza",
  "Colchón 2 plazas", "Colchón Queen", "Colchón King", "Butacas",
  "Interiores vehículos", "Cortinas roller", "Respaldos", "Otros"
];

const MODALITIES = ["Trae al local", "A domicilio", "Retiramos nosotros"];
const PAYMENT_METHODS = ["Efectivo", "Transferencia"];
const STATUSES = ["Confirmado", "Pendiente de confirmación", "Otro"];
const STATUS_ALL = ["Confirmado", "Pendiente de confirmación", "Terminado", "Otro"];
const EXPENSE_CATEGORIES = [
  "Combustible", "Publicidad", "Insumos de limpieza", "Empleados",
  "Community Manager", "Mantenimiento vehículo", "Mantenimiento máquinas", "Otros"
];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ============================================================
// Supabase client
// ============================================================
const SUPABASE_URL = "https://oloklhrimxupwlwvijpe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sb2tsaHJpbXh1cHdsd3ZpanBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjA1MTgsImV4cCI6MjA4OTI5NjUxOH0.lynoRqZ0KLVhF5Bqgsf0kPQFGBkWRRt0I8zUsRFFWDs";

const supabase = {
  from: (table) => ({
    select: async () => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      const data = await res.json();
      return { data: Array.isArray(data) ? data : [], error: res.ok ? null : data };
    },
    insert: async (rows) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    update: async (values, id) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    delete: async (id) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      return { error: res.ok ? null : await res.json() };
    }
  })
};

// Map DB snake_case to app camelCase
const mapJobFromDB = (j) => ({
  id: j.id, clientName: j.client_name, phone: j.phone, address: j.address,
  serviceType: j.service_type, otherDetail: j.other_detail, description: j.description,
  modality: j.modality, value: Number(j.value), paymentMethod: j.payment_method,
  paid: j.paid, date: j.date, hour: j.hour, status: j.status, statusDetail: j.status_detail
});
const mapJobToDB = (j) => ({
  id: j.id, client_name: j.clientName, phone: j.phone, address: j.address,
  service_type: j.serviceType, other_detail: j.otherDetail || "", description: j.description || "",
  modality: j.modality, value: j.value, payment_method: j.paymentMethod,
  paid: j.paid, date: j.date || null, hour: j.hour || "", status: j.status, status_detail: j.statusDetail || ""
});
const mapExpenseFromDB = (e) => ({
  id: e.id, category: e.category, otherDetail: e.other_detail, description: e.description,
  amount: Number(e.amount), date: e.date, isFixed: e.is_fixed
});
const mapExpenseToDB = (e) => ({
  id: e.id, category: e.category, other_detail: e.otherDetail || "", description: e.description || "",
  amount: e.amount, date: e.date || null, is_fixed: e.isFixed || false
});
const mapFixedFromDB = (e) => ({
  id: e.id, category: e.category, otherDetail: e.other_detail, description: e.description,
  amount: Number(e.amount), active: e.active, isFixed: true
});
const mapFixedToDB = (e) => ({
  id: e.id, category: e.category, other_detail: e.otherDetail || "", description: e.description || "",
  amount: e.amount, active: e.active !== false
});

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const formatMoney = (n) => {
  if (n == null || isNaN(n)) return "$0";
  return "$" + Number(n).toLocaleString("es-AR");
};

const parseDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const getMonthYear = (dateStr) => {
  if (!dateStr) return null;
  const [y, m] = dateStr.split("-").map(Number);
  return { month: m, year: y };
};

// ============================================================
// ICONS (simple SVG)
// ============================================================
const Icons = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  jobs: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  clients: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  expenses: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  chevLeft: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="15 18 9 12 15 6"/></svg>,
  chevRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  filter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

// ============================================================
// STYLES
// ============================================================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Roboto:wght@700;900&display=swap');

:root {
  --bg: #111318;
  --bg-card: #1a1d24;
  --bg-card-hover: #1f222b;
  --bg-sidebar: #0d0f13;
  --bg-sidebar-hover: #1a1d24;
  --bg-sidebar-active: rgba(255,163,51,0.12);
  --text: #f0f0f0;
  --text-secondary: #8a8f9a;
  --text-sidebar: #6b7280;
  --text-sidebar-active: #ffa333;
  --accent: #ffa333;
  --accent-light: rgba(255,163,51,0.15);
  --accent-hover: #ffba6a;
  --accent-soft: #ffd19b;
  --green: #34d399;
  --green-light: rgba(52,211,153,0.12);
  --green-bg: rgba(52,211,153,0.08);
  --red: #f87171;
  --red-light: rgba(248,113,113,0.12);
  --yellow: #fbbf24;
  --yellow-light: rgba(251,191,36,0.12);
  --orange: #ffa333;
  --purple: #a78bfa;
  --purple-light: rgba(167,139,250,0.12);
  --border: rgba(255,255,255,0.06);
  --border-focus: #ffa333;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow: 0 2px 8px rgba(0,0,0,0.3);
  --shadow-lg: 0 12px 24px rgba(0,0,0,0.4);
  --radius: 12px;
  --radius-lg: 16px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

.app { display: flex; min-height: 100vh; }

/* Sidebar */
.sidebar {
  width: 250px;
  background: var(--bg-sidebar);
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-right: 1px solid var(--border);
}

.sidebar-logo {
  padding: 10px 12px 22px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-logo img, .sidebar-logo svg {
  width: 100%;
  max-height: 50px;
  object-fit: contain;
}

.sidebar-logo-text {
  font-family: 'Roboto', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  line-height: 1.3;
  text-align: center;
}

.sidebar-logo-text span { color: var(--accent); }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  color: var(--text-sidebar);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.nav-item svg { width: 22px; height: 22px; }

.nav-item:hover { background: var(--bg-sidebar-hover); color: #d1d5db; }
.nav-item.active { 
  background: var(--bg-sidebar-active); 
  color: var(--text-sidebar-active);
  font-weight: 600;
}

.nav-badge {
  margin-left: auto;
  background: var(--red);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

/* Main content */
.main {
  margin-left: 250px;
  flex: 1;
  padding: 28px 32px;
  min-height: 100vh;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  font-family: 'Roboto', sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

/* Cards */
.card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 20px;
  margin-bottom: 16px;
  transition: border-color 0.2s ease;
}
.card:hover { border-color: rgba(255,255,255,0.1); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, border-color 0.2s ease;
  position: relative;
  overflow: hidden;
}
.stat-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.1); }
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 16px 16px 0 0;
}
.stat-card:nth-child(1)::before { background: var(--green); }
.stat-card:nth-child(2)::before { background: var(--red); }
.stat-card:nth-child(3)::before { background: var(--accent); }
.stat-card:nth-child(4)::before { background: var(--yellow); }

.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
}

.stat-value.green { color: var(--green); }
.stat-value.red { color: var(--red); }
.stat-value.blue { color: var(--accent); }
.stat-value.yellow { color: var(--yellow); }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--accent);
  color: #1a1a1a;
  border-color: var(--accent);
}
.btn-primary:hover { background: var(--accent-hover); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,163,51,0.3); }

.btn-secondary {
  background: var(--bg-card);
  color: var(--text);
  border-color: var(--border);
}
.btn-secondary:hover { background: var(--bg-card-hover); border-color: rgba(255,255,255,0.12); }

.btn-danger { background: rgba(248,113,113,0.15); color: var(--red); border-color: rgba(248,113,113,0.2); }
.btn-danger:hover { background: rgba(248,113,113,0.25); }

.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-icon {
  padding: 7px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;
}
.btn-icon:hover { background: rgba(255,255,255,0.06); color: var(--text); }

/* Forms */
.form-group { margin-bottom: 14px; }
.form-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  background: var(--bg);
  color: var(--text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(255,163,51,0.12);
}
.form-select { appearance: auto; }
.form-textarea { resize: vertical; min-height: 60px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

/* Table */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th {
  text-align: left;
  padding: 12px 14px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
tr { transition: background 0.15s ease; }
tr:hover { background: rgba(255,255,255,0.02); }
tr.paid-row { background: rgba(52,211,153,0.06); }
tr.paid-row td:first-child { box-shadow: inset 3px 0 0 var(--green); }

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.badge-pending { background: rgba(250,204,21,0.15); color: #facc15; }
.badge-confirmed { background: var(--accent-light); color: var(--accent); }
.badge-done { background: var(--green-light); color: var(--green); }
.badge-other { background: var(--purple-light); color: var(--purple); }
.badge-paid { background: var(--green-light); color: var(--green); }
.badge-unpaid { background: var(--red-light); color: var(--red); }

/* Calendar */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 3px;
}
.calendar-header-cell {
  padding: 8px 4px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
}
.calendar-cell {
  min-height: 90px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  position: relative;
  overflow: hidden;
  transition: border-color 0.15s ease;
}
.calendar-cell:hover { border-color: rgba(255,255,255,0.12); }
.calendar-cell.other-month { background: var(--bg); opacity: 0.4; }
.calendar-cell.today { border-color: var(--accent); border-width: 2px; box-shadow: 0 0 12px rgba(255,163,51,0.15); }
.calendar-day-num {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 2px;
  padding: 2px 4px;
}
.calendar-event {
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 4px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
  font-weight: 500;
}
.calendar-event.confirmed { background: var(--accent-light); color: var(--accent); }
.calendar-event.pending { background: rgba(250,204,21,0.15); color: #facc15; }
.calendar-event.retiro { background: rgba(96,165,250,0.15); color: #60a5fa; }
.calendar-event.done { background: var(--green-light); color: var(--green); }
.calendar-event.other-status { background: var(--purple-light); color: var(--purple); }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeOverlay 0.2s ease;
}
@keyframes fadeOverlay {
  from { opacity: 0; }
  to { opacity: 1; }
}
.modal {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 24px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  animation: slideModal 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes slideModal {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.modal-title {
  font-family: 'Roboto', sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 18px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Filter bar */
.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 16px;
}
.filter-chip {
  padding: 7px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'DM Sans', sans-serif;
}
.filter-chip:hover { border-color: var(--accent); color: var(--accent); }
.filter-chip.active { background: var(--accent); color: #1a1a1a; border-color: var(--accent); font-weight: 700; }

/* Chart */
.chart-container { padding: 16px 0; }
.chart-bar-group { display: flex; align-items: flex-end; gap: 2px; justify-content: center; }
.chart-bar {
  width: 36px;
  border-radius: 6px 6px 0 0;
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  background: linear-gradient(180deg, var(--accent) 0%, rgba(255,163,51,0.6) 100%);
}
.chart-bar:hover { opacity: 0.85; filter: brightness(1.1); }
.chart-label {
  font-size: 10px;
  color: var(--text-secondary);
  text-align: center;
  margin-top: 6px;
  font-weight: 500;
}
.chart-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  justify-content: space-around;
  padding: 0 8px;
}

/* Notifications */
.notif-banner {
  background: rgba(255,163,51,0.1);
  border: 1px solid rgba(255,163,51,0.2);
  border-radius: var(--radius);
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
}

/* Search */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 14px;
  min-width: 200px;
  transition: border-color 0.2s ease;
}
.search-box:focus-within { border-color: var(--accent); }
.search-box input {
  border: none;
  outline: none;
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  flex: 1;
  background: transparent;
  color: var(--text);
}
.search-box input::placeholder { color: var(--text-secondary); }

/* Responsive */
.mobile-toggle {
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 200;
  background: var(--bg-card);
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 18px;
}

.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 99;
}

@media (max-width: 768px) {
  .sidebar-overlay { display: block; }
  .sidebar { 
    transform: translateX(-100%); 
    width: 100%;
    height: 100vh;
    height: 100dvh;
  }
  .sidebar.open { transform: translateX(0); }
  .mobile-toggle { display: block; }
  .main { 
    margin-left: 0; 
    padding: 56px 14px 20px;
    width: 100%;
    overflow-x: hidden;
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 16px;
  }
  .page-title { font-size: 20px; }
  .form-row, .form-row-3 { grid-template-columns: 1fr; }
  .stats-grid { 
    grid-template-columns: 1fr 1fr; 
    gap: 10px;
  }
  .stat-card { padding: 14px 12px; }
  .stat-label { font-size: 10px; }
  .stat-value { font-size: 22px; }
  .card { padding: 14px; margin-bottom: 12px; }
  .calendar-cell { min-height: 50px; padding: 2px; }
  .calendar-event { font-size: 8px; padding: 1px 2px; margin-bottom: 1px; }
  .calendar-day-num { font-size: 10px; padding: 1px 2px; }
  .calendar-header-cell { font-size: 9px; padding: 4px 1px; }
  .calendar-grid { gap: 1px; }
  .card:has(.calendar-grid) { padding: 10px; overflow-x: auto; }
  .calendar-grid { min-width: 0; }
  .filter-bar { gap: 6px; }
  .filter-chip { padding: 5px 10px; font-size: 11px; }
  .search-box { min-width: unset; width: 100%; }
  .table-wrap { margin: 0 -14px; }
  table { font-size: 12px; }
  th { padding: 8px 8px; font-size: 10px; }
  td { padding: 8px 8px; }
  .btn { padding: 8px 12px; font-size: 12px; }
  .btn-sm { padding: 4px 8px; font-size: 11px; }
  .modal { 
    padding: 18px; 
    margin: 10px;
    max-height: 85vh;
  }
  .modal-title { font-size: 17px; }
  .notif-banner { font-size: 12px; padding: 10px 12px; }
  .chart-row { padding: 0; overflow-x: auto; }
  .chart-bar { width: 20px; }
  .chart-label { font-size: 8px; }
  .compare-select { font-size: 12px; padding: 5px 8px; }
  .flex.items-center.justify-between.mb-2 { flex-wrap: wrap; gap: 8px; }
}

/* Misc */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}
.empty-state-icon { font-size: 40px; margin-bottom: 8px; }
.divider { height: 1px; background: var(--border); margin: 16px 0; }
.text-sm { font-size: 13px; }
.text-xs { font-size: 11px; }
.text-muted { color: var(--text-secondary); }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; }
.gap-2 { gap: 8px; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.inline-flex { display: inline-flex; }

.compare-select {
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  background: var(--bg-card);
  color: var(--text);
}

.client-history-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.client-history-item:last-child { border-bottom: none; }

.toggle-paid {
  cursor: pointer;
  transition: all 0.2s ease;
}
.toggle-paid:hover { transform: scale(1.15); }
`;

// ============================================================
// MODAL COMPONENT
// ============================================================
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="modal-title">{title}</div>
          <button className="btn-icon" onClick={onClose}>{Icons.x}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// JOB FORM
// ============================================================
function JobForm({ job, clients, onSave, onCancel }) {
  const [form, setForm] = useState(job || {
    clientName: "", phone: "", address: "", serviceType: SERVICE_TYPES[0],
    otherDetail: "", description: "", modality: MODALITIES[1], value: "",
    paymentMethod: PAYMENT_METHODS[1], paid: false, date: new Date().toISOString().slice(0, 10),
    hour: "", status: STATUSES[0], statusDetail: ""
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClientSelect = (name) => {
    const client = clients.find(c => c.name === name);
    if (client) {
      setForm(f => ({ ...f, clientName: client.name, phone: client.phone || "", address: client.address || "" }));
    } else {
      set("clientName", name);
    }
  };

  const handleSubmit = async () => {
    if (!form.clientName || !form.value || !form.date) {
      alert("Completá cliente, valor y fecha");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, value: Number(form.value) });
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    }
    setSaving(false);
  };

  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Cliente *</label>
          <input className="form-input" list="client-list" value={form.clientName}
            onChange={e => handleClientSelect(e.target.value)} placeholder="Nombre del cliente" />
          <datalist id="client-list">
            {clients.map(c => <option key={c.id} value={c.name} />)}
          </datalist>
        </div>
        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <input className="form-input" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Ej: 291-4123456" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Dirección</label>
        <input className="form-input" value={form.address} onChange={e => set("address", e.target.value)} placeholder="Ej: Calfulcura 483" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tipo de servicio</label>
          <select className="form-select" value={form.serviceType} onChange={e => set("serviceType", e.target.value)}>
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Modalidad</label>
          <select className="form-select" value={form.modality} onChange={e => set("modality", e.target.value)}>
            {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Fecha *</label>
          <input className="form-input" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Hora</label>
          <input className="form-input" type="time" value={form.hour || ""} onChange={e => set("hour", e.target.value)} />
        </div>
        <div />
      </div>
      {form.serviceType === "Otros" && (
        <div className="form-group">
          <label className="form-label">Detalle del servicio</label>
          <input className="form-input" value={form.otherDetail} onChange={e => set("otherDetail", e.target.value)} placeholder="Describí el servicio" />
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Descripción / Observaciones</label>
        <textarea className="form-textarea" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Ej: Está orinado, mucha grasitud..." />
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Valor ($) *</label>
          <input className="form-input" type="number" value={form.value} onChange={e => set("value", e.target.value)} placeholder="75000" />
        </div>
        <div className="form-group">
          <label className="form-label">Medio de pago</label>
          <select className="form-select" value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)}>
            {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Estado</label>
          <select className="form-select" value={form.status} onChange={e => set("status", e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {form.status === "Otro" && (
        <div className="form-group">
          <label className="form-label">Detalle del estado</label>
          <input className="form-input" value={form.statusDetail} onChange={e => set("statusDetail", e.target.value)} placeholder="Detalle..." />
        </div>
      )}
      <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={form.paid} onChange={e => set("paid", e.target.checked)} style={{ width: 16, height: 16 }} />
          Pagado
        </label>
      </div>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
      </div>
    </>
  );
}

// ============================================================
// EXPENSE FORM
// ============================================================
function ExpenseForm({ expense, onSave, onCancel }) {
  const [form, setForm] = useState(expense || {
    category: EXPENSE_CATEGORIES[0], otherDetail: "", description: "",
    amount: "", date: new Date().toISOString().slice(0, 10), isFixed: false
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.amount) {
      alert("Completá el monto");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, amount: Number(form.amount) });
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    }
    setSaving(false);
  };

  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Categoría</label>
          <select className="form-select" value={form.category} onChange={e => set("category", e.target.value)}>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Monto ($) *</label>
          <input className="form-input" type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="50000" />
        </div>
      </div>
      {form.category === "Otros" && (
        <div className="form-group">
          <label className="form-label">Detalle de categoría</label>
          <input className="form-input" value={form.otherDetail} onChange={e => set("otherDetail", e.target.value)} placeholder="Describí el gasto" />
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <input className="form-input" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Ej: Nafta para camioneta" />
      </div>
      <div className="form-group">
        <label className="form-label">Fecha</label>
        <input className="form-input" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
      </div>
      <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={form.isFixed} onChange={e => set("isFixed", e.target.checked)} style={{ width: 16, height: 16 }} />
          Gasto fijo (se repite cada mes)
        </label>
      </div>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
      </div>
    </>
  );
}

// ============================================================
// SIMPLE BAR CHART
// ============================================================
function BarChart({ data, maxVal, colorA = "#ffa333", colorB = "#f87171", labelKey = "label", valKeyA = "a", valKeyB = "b", legendA, legendB }) {
  const max = maxVal || Math.max(...data.map(d => Math.max(d[valKeyA] || 0, d[valKeyB] || 0)), 1);
  return (
    <div>
      {legendA && (
        <div className="flex gap-2 items-center mb-2" style={{ fontSize: 11, fontWeight: 600 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: colorA, display: "inline-block" }} /> {legendA}
          {legendB && <><span style={{ width: 12, height: 12, borderRadius: 3, background: colorB, display: "inline-block", marginLeft: 12 }} /> {legendB}</>}
        </div>
      )}
      <div className="chart-row" style={{ height: 180, alignItems: "flex-end" }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div className="chart-bar-group" style={{ height: 160 }}>
              {d[valKeyA] != null && (
                <div className="chart-bar" title={formatMoney(d[valKeyA])}
                  style={{ height: `${Math.max((d[valKeyA] / max) * 150, 2)}px`, background: colorA, width: d[valKeyB] != null ? 16 : 32 }} />
              )}
              {d[valKeyB] != null && (
                <div className="chart-bar" title={formatMoney(d[valKeyB])}
                  style={{ height: `${Math.max((d[valKeyB] / max) * 150, 2)}px`, background: colorB, width: 16 }} />
              )}
            </div>
            <div className="chart-label">{d[labelKey]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [jobModal, setJobModal] = useState(null); // null | "new" | job object
  const [expenseModal, setExpenseModal] = useState(null);
  const [clientModal, setClientModal] = useState(null);

  // Filters
  const [jobFilter, setJobFilter] = useState("all");
  const [jobSearch, setJobSearch] = useState("");
  const [jobMonthFilter, setJobMonthFilter] = useState("all"); // "all" or "2026-3" etc
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null); // date string like "2026-03-17"

  // Dashboard
  const [dashMonth, setDashMonth] = useState(new Date().getMonth() + 1);
  const [dashYear, setDashYear] = useState(new Date().getFullYear());
  const [compareMonth, setCompareMonth] = useState(-1);
  const [clientSort, setClientSort] = useState("none"); // "none" | "asc" | "desc"

  // Load data from Supabase
  useEffect(() => {
    (async () => {
      try {
        const [jRes, cRes, eRes, fRes] = await Promise.all([
          supabase.from("jobs").select(),
          supabase.from("clients").select(),
          supabase.from("expenses").select(),
          supabase.from("fixed_expenses").select()
        ]);
        if (jRes.data) setJobs(jRes.data.map(mapJobFromDB));
        if (cRes.data) setClients(cRes.data);
        if (eRes.data) setExpenses(eRes.data.map(mapExpenseFromDB));
        if (fRes.data) setFixedExpenses(fRes.data.map(mapFixedFromDB));
      } catch (err) { console.error("Error loading data:", err); }
      setLoading(false);
    })();
  }, []);

  // Ensure client exists
  const ensureClient = async (name, phone, address) => {
    if (!name) return;
    const existing = clients.find(c => 
      c.name.toLowerCase() === name.toLowerCase() && 
      (c.address || "").toLowerCase() === (address || "").toLowerCase()
    );
    if (existing) {
      const updated = { ...existing, phone: phone || existing.phone };
      await supabase.from("clients").update({ phone: updated.phone }, existing.id);
      setClients(prev => prev.map(c => c.id === existing.id ? updated : c));
    } else {
      const newClient = { id: genId(), name, phone: phone || "", address: address || "" };
      await supabase.from("clients").insert(newClient);
      setClients(prev => [...prev, newClient]);
    }
  };

  // Job CRUD
  const handleSaveJob = async (formData) => {
    // Auto-set Terminado if paid
    if (formData.paid) formData.status = "Terminado";
    await ensureClient(formData.clientName, formData.phone, formData.address);
    if (jobModal && jobModal.id) {
      const updated = { ...jobModal, ...formData };
      await supabase.from("jobs").update(mapJobToDB(updated), jobModal.id);
      setJobs(prev => prev.map(j => j.id === jobModal.id ? updated : j));
    } else {
      const newJob = { ...formData, id: genId() };
      await supabase.from("jobs").insert(mapJobToDB(newJob));
      setJobs(prev => [...prev, newJob]);
    }
    setJobModal(null);
  };

  const deleteJob = async (id) => {
    if (confirm("¿Eliminar este trabajo?")) {
      await supabase.from("jobs").delete(id);
      setJobs(prev => prev.filter(j => j.id !== id));
    }
  };

  const togglePaid = async (id) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    const newPaid = !job.paid;
    const newStatus = newPaid ? "Terminado" : job.status === "Terminado" ? "Confirmado" : job.status;
    await supabase.from("jobs").update({ paid: newPaid, status: newStatus }, id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, paid: newPaid, status: newStatus } : j));
  };

  const deleteClient = async (id) => {
    if (confirm("¿Eliminar este cliente? (los trabajos asociados NO se eliminan)")) {
      await supabase.from("clients").delete(id);
      setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  // Expense CRUD
  const handleSaveExpense = async (formData) => {
    if (formData.isFixed) {
      if (expenseModal && expenseModal.id) {
        const updated = { ...expenseModal, ...formData };
        await supabase.from("fixed_expenses").update(mapFixedToDB(updated), expenseModal.id);
        setFixedExpenses(prev => prev.map(e => e.id === expenseModal.id ? updated : e));
      } else {
        const newExp = { ...formData, id: genId(), active: true };
        await supabase.from("fixed_expenses").insert(mapFixedToDB(newExp));
        setFixedExpenses(prev => [...prev, newExp]);
      }
    } else {
      if (expenseModal && expenseModal.id) {
        const updated = { ...expenseModal, ...formData };
        await supabase.from("expenses").update(mapExpenseToDB(updated), expenseModal.id);
        setExpenses(prev => prev.map(e => e.id === expenseModal.id ? updated : e));
      } else {
        const newExp = { ...formData, id: genId() };
        await supabase.from("expenses").insert(mapExpenseToDB(newExp));
        setExpenses(prev => [...prev, newExp]);
      }
    }
    setExpenseModal(null);
  };

  const deleteExpense = async (id, isFixed) => {
    if (confirm("¿Eliminar este gasto?")) {
      if (isFixed) {
        await supabase.from("fixed_expenses").delete(id);
        setFixedExpenses(prev => prev.filter(e => e.id !== id));
      } else {
        await supabase.from("expenses").delete(id);
        setExpenses(prev => prev.filter(e => e.id !== id));
      }
    }
  };

  const toggleFixedExpense = async (id) => {
    const exp = fixedExpenses.find(e => e.id === id);
    if (!exp) return;
    const newActive = !exp.active;
    await supabase.from("fixed_expenses").update({ active: newActive }, id);
    setFixedExpenses(prev => prev.map(e => e.id === id ? { ...e, active: newActive } : e));
  };

  // Computed data
  const getMonthIncome = (month, year) => {
    return jobs.filter(j => {
      const my = getMonthYear(j.date);
      return my && my.month === month && my.year === year;
    }).reduce((sum, j) => sum + (j.value || 0), 0);
  };

  const getMonthExpenses = (month, year) => {
    const variable = expenses.filter(e => {
      const my = getMonthYear(e.date);
      return my && my.month === month && my.year === year;
    }).reduce((sum, e) => sum + (e.amount || 0), 0);
    const fixed = fixedExpenses.filter(e => e.active).reduce((sum, e) => sum + (e.amount || 0), 0);
    return variable + fixed;
  };

  const totalUnpaid = useMemo(() => jobs.filter(j => !j.paid).reduce((sum, j) => sum + (j.value || 0), 0), [jobs]);

  const tomorrowJobs = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tStr = tomorrow.toISOString().slice(0, 10);
    return jobs.filter(j => j.date === tStr && j.status !== "Terminado");
  }, [jobs]);

  const todayJobs = useMemo(() => {
    const tStr = new Date().toISOString().slice(0, 10);
    return jobs.filter(j => j.date === tStr && j.status !== "Terminado");
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    if (jobFilter === "unpaid") result = result.filter(j => !j.paid);
    else if (jobFilter === "paid") result = result.filter(j => j.paid);
    else if (STATUS_ALL.includes(jobFilter)) result = result.filter(j => j.status === jobFilter);
    if (jobMonthFilter !== "all") {
      const [fy, fm] = jobMonthFilter.split("-").map(Number);
      result = result.filter(j => {
        const my = getMonthYear(j.date);
        return my && my.month === fm && my.year === fy;
      });
    }
    if (jobSearch) {
      const s = jobSearch.toLowerCase();
      result = result.filter(j => j.clientName?.toLowerCase().includes(s) || j.serviceType?.toLowerCase().includes(s) || j.description?.toLowerCase().includes(s));
    }
    return result.reverse();
  }, [jobs, jobFilter, jobSearch, jobMonthFilter]);

  const filteredUnpaidTotal = useMemo(() => {
    if (jobFilter === "unpaid") return filteredJobs.reduce((sum, j) => sum + (j.value || 0), 0);
    return null;
  }, [filteredJobs, jobFilter]);

  // Status badge
  const statusBadge = (status) => {
    if (status === "Pendiente de confirmación") return <span className="badge badge-pending">Pendiente</span>;
    if (status === "Confirmado") return <span className="badge badge-confirmed">Confirmado</span>;
    if (status === "Terminado") return <span className="badge badge-done">Terminado</span>;
    return <span className="badge badge-other">Otro</span>;
  };

  // Navigate page
  const nav = (p) => { setPage(p); setSidebarOpen(false); };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'DM Sans', sans-serif" }}>Cargando...</div>;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Mobile toggle */}
        <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        
        {/* Mobile overlay */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="30 160 360 75">
              <defs><style>{`.logo-dark{fill:#ffffff}.logo-accent{fill:#f7a51c}.logo-th{fill:#ffffff}`}</style></defs>
              <g>
                <polygon className="logo-th" points="54.4 229.5 69.4 229.5 69.4 184.3 88.3 184.3 88.3 172.1 39.1 172.1 39.1 184.3 54.4 184.3 54.4 229.5"/>
                <polygon className="logo-accent" points="107.8 172.1 107.8 194.5 88.1 194.5 88.1 187.3 85.2 187.3 73 187.3 73 229.5 88.1 229.5 88.1 206.6 107.8 206.6 107.8 229.5 122.8 229.5 122.8 172.1 107.8 172.1"/>
              </g>
              <g>
                <g>
                  <path className="logo-dark" d="M161.5,180v19.4h-8.5v-19.4h-5.7v-6.6h19.9v6.6h-5.7Z"/>
                  <path className="logo-dark" d="M168.8,199.3v-26h8.6v26h-8.6Z"/>
                  <path className="logo-dark" d="M198.9,199.3l-11.3-13.4v13.4h-8.6v-26h8.2l11.2,13.4v-13.4h8.3v26h-7.9Z"/>
                  <path className="logo-dark" d="M222.6,180v19.4h-8.5v-19.4h-5.7v-6.6h19.9v6.6h-5.7Z"/>
                  <path className="logo-dark" d="M261.5,192.3c-.9,1.8-2.1,3.3-3.6,4.5-1.5,1.2-3.3,2.1-5.2,2.7-2,.6-4,.8-6.1.7-2.1,0-4.2-.2-6.2-.7-2-.6-3.8-1.4-5.4-2.6-1.6-1.2-2.8-2.6-3.8-4.4-.9-1.8-1.3-3.8-1.2-6.1,0-2.2.4-4.2,1.3-6s2.2-3.3,3.7-4.5c1.6-1.2,3.3-2.1,5.3-2.7s4.1-.8,6.2-.7c2.1,0,4.1.2,6.1.8,2,.6,3.7,1.5,5.3,2.7s2.8,2.7,3.7,4.4c.9,1.8,1.3,3.8,1.2,6,0,2.2-.4,4.2-1.3,5.9ZM253.1,183.7c-.4-.8-.9-1.5-1.6-2-.7-.6-1.4-1-2.3-1.3-.9-.3-1.8-.5-2.8-.5s-1.9.1-2.8.3c-.9.2-1.7.6-2.4,1.1-.7.5-1.3,1.2-1.7,2s-.7,1.8-.7,2.9.2,2,.7,2.8c.4.8,1,1.4,1.7,2,.7.5,1.5.9,2.4,1.2s1.8.4,2.8.4,1.8-.1,2.7-.4c.9-.2,1.6-.6,2.3-1.1.7-.5,1.2-1.2,1.6-2,.4-.8.6-1.8.6-2.9s-.2-1.8-.6-2.6Z"/>
                  <path className="logo-dark" d="M278.4,199.3l-5.5-7.4v7.4h-8.6v-26h11.2c1.4,0,2.8.2,4,.5,1.3.3,2.3.9,3.3,1.6.9.7,1.7,1.6,2.2,2.7s.8,2.4.8,3.9-.5,3-1.4,4.2c-.9,1.2-2.2,2.1-4,2.8l8.8,10.4h-10.9ZM275.8,180.4c-.6-.3-1.3-.5-2.1-.5h-.8v4.4h.8c.8,0,1.5-.2,2.1-.5.6-.3.9-.9.9-1.8,0-.7-.3-1.3-.9-1.6Z"/>
                  <path className="logo-dark" d="M289.3,199.3v-26h19.5v7h-11s0,2.9,0,2.9h10.3v6.5s-10.3,0-10.3,0v2.8h11v6.8h-19.5Z"/>
                  <path className="logo-dark" d="M324.5,199.3l-5.5-7.4v7.4h-8.6v-26h11.2c1.4,0,2.8.2,4,.5,1.3.3,2.3.9,3.3,1.6.9.7,1.7,1.6,2.2,2.7s.8,2.4.8,3.9-.5,3-1.4,4.2c-.9,1.2-2.2,2.1-4,2.8l8.8,10.4h-10.9ZM321.9,180.4c-.6-.3-1.3-.5-2.1-.5h-.8v4.4h.8c.8,0,1.5-.2,2.1-.5.6-.3.9-.9.9-1.8,0-.7-.3-1.3-.9-1.6Z"/>
                  <path className="logo-dark" d="M335.4,199.3v-26h8.6v26h-8.6Z"/>
                  <path className="logo-dark" d="M367.1,199.3l-1-3.6h-9l-1,3.6h-10.4l11.4-26h9.1l11.3,26h-10.4ZM364.1,190.1c-.4-1-.7-1.8-.9-2.5-.2-.7-.4-1.3-.6-1.8-.2-.5-.3-.9-.4-1.3,0-.4-.2-.8-.3-1.2,0-.4-.1-.8-.2-1.2,0-.4-.1-1-.2-1.6,0,.6-.2,1.1-.2,1.6,0,.4-.1.8-.2,1.2,0,.4-.2.8-.3,1.2,0,.4-.2.8-.4,1.3-.2.5-.3,1.1-.6,1.8-.2.7-.5,1.5-.8,2.5h5.1Z"/>
                  <path className="logo-dark" d="M164.1,229.5v-10.1h-8.3v10.1h-8.6v-26h8.6v9.4h8.3v-9.4h8.6v26h-8.6Z"/>
                  <path className="logo-dark" d="M174.3,229.5v-26h19.5v7h-11s0,2.9,0,2.9h10.3v6.5s-10.3,0-10.3,0v2.8h11v6.8h-19.5Z"/>
                  <path className="logo-dark" d="M209.5,229.5l-5.5-7.4v7.4h-8.6v-26h11.2c1.4,0,2.8.2,4,.5,1.3.3,2.3.9,3.3,1.6.9.7,1.7,1.6,2.2,2.7.6,1.1.8,2.4.8,3.9s-.5,3-1.4,4.2c-.9,1.2-2.2,2.1-4,2.8l8.8,10.4h-10.9ZM206.9,210.5c-.6-.3-1.3-.5-2.1-.5h-.8v4.4h.8c.8,0,1.5-.2,2.1-.5.6-.3.9-.9.9-1.8,0-.7-.3-1.3-.9-1.6Z"/>
                  <path className="logo-dark" d="M240.3,229.5l-11.3-13.4v13.4h-8.6v-26h8.2l11.2,13.4v-13.4h8.3v26h-7.9Z"/>
                  <path className="logo-dark" d="M271.3,229.5l-1-3.6h-9l-1,3.6h-10.4l11.4-26h9.1l11.3,26h-10.4ZM268.3,220.2c-.4-1-.7-1.8-.9-2.5-.2-.7-.4-1.3-.6-1.8-.2-.5-.3-.9-.4-1.3,0-.4-.2-.8-.3-1.2,0-.4-.1-.8-.2-1.2,0-.4-.1-1-.2-1.6,0,.6-.2,1.1-.2,1.6,0,.4-.1.8-.2,1.2,0,.4-.2.8-.3,1.2,0,.4-.2.8-.4,1.3-.2.5-.3,1.1-.6,1.8-.2.7-.5,1.5-.8,2.5h5.1Z"/>
                  <path className="logo-dark" d="M301.6,229.5l-11.3-13.4v13.4h-8.6v-26h8.2l11.2,13.4v-13.4h8.3v26h-7.9Z"/>
                  <path className="logo-dark" d="M334.8,221.9c-.9,1.7-2,3.1-3.5,4.4-1.4,1.2-2.8,2-4.4,2.5s-3.3.7-5.3.7h-10.6v-26h10.6c3.6,0,6.8,1.1,9.6,3.2,3.2,2.5,4.8,5.8,4.8,9.9s-.4,3.8-1.3,5.4ZM325.2,212c-1.3-1-3.1-1.5-5.6-1.5v12c1.1,0,2.1,0,3-.3.9-.2,1.7-.5,2.3-.9.6-.4,1.2-1.1,1.5-1.8.4-.8.6-1.8.6-3,0-2-.6-3.5-1.9-4.5Z"/>
                  <path className="logo-dark" d="M337.8,229.5v-26h19.5v7h-11s0,2.9,0,2.9h10.3v6.5s-10.3,0-10.3,0v2.8h11v6.8h-19.5Z"/>
                  <path className="logo-dark" d="M373.1,222.5h11.1v6.9h-26.6l13.6-19.2h-10.3v-6.8h25.5l-13.3,19Z"/>
                </g>
                <polygon className="logo-dark" points="336 171.2 341.1 171.2 345.5 165.5 337.4 165.5 336 171.2"/>
              </g>
            </svg>
          </div>
          <button className={`nav-item ${page === "dashboard" ? "active" : ""}`} onClick={() => nav("dashboard")}>
            {Icons.dashboard} Dashboard
          </button>
          <button className={`nav-item ${page === "jobs" ? "active" : ""}`} onClick={() => nav("jobs")}>
            {Icons.jobs} Trabajos
            {totalUnpaid > 0 && <span className="nav-badge">{jobs.filter(j => !j.paid).length}</span>}
          </button>
          <button className={`nav-item ${page === "calendar" ? "active" : ""}`} onClick={() => nav("calendar")}>
            {Icons.calendar} Calendario
          </button>
          <button className={`nav-item ${page === "clients" ? "active" : ""}`} onClick={() => nav("clients")}>
            {Icons.clients} Clientes
          </button>
          <button className={`nav-item ${page === "expenses" ? "active" : ""}`} onClick={() => nav("expenses")}>
            {Icons.expenses} Gastos
          </button>
        </aside>

        {/* Main */}
        <main className="main">
          {/* NOTIFICATIONS */}
          {todayJobs.length > 0 && (
            <div className="notif-banner">
              {Icons.bell} Hoy tenés {todayJobs.length} trabajo{todayJobs.length > 1 ? "s" : ""} pendiente{todayJobs.length > 1 ? "s" : ""}
            </div>
          )}
          {tomorrowJobs.length > 0 && (
            <div className="notif-banner">
              {Icons.bell} Mañana tenés {tomorrowJobs.length} turno{tomorrowJobs.length > 1 ? "s" : ""}
            </div>
          )}

          {/* ==================== DASHBOARD ==================== */}
          {page === "dashboard" && (
            <>
              <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <div className="flex items-center gap-2">
                  <select className="compare-select" value={`${dashYear}-${dashMonth}`} onChange={e => {
                    const [y, m] = e.target.value.split("-").map(Number);
                    setDashYear(y); setDashMonth(m);
                  }}>
                    {[2025, 2026, 2027].map(y => MONTHS.map((m, i) => (
                      <option key={`${y}-${i}`} value={`${y}-${i + 1}`}>{m} {y}</option>
                    )))}
                  </select>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Ingresos del mes</div>
                  <div className="stat-value green">{formatMoney(getMonthIncome(dashMonth, dashYear))}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Gastos del mes</div>
                  <div className="stat-value red">{formatMoney(getMonthExpenses(dashMonth, dashYear))}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Ganancia neta</div>
                  <div className={`stat-value ${getMonthIncome(dashMonth, dashYear) - getMonthExpenses(dashMonth, dashYear) >= 0 ? "green" : "red"}`}>
                    {formatMoney(getMonthIncome(dashMonth, dashYear) - getMonthExpenses(dashMonth, dashYear))}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Pendiente de cobro</div>
                  <div className="stat-value yellow">{formatMoney(totalUnpaid)}</div>
                </div>
              </div>

              {/* Annual chart */}
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 style={{ fontWeight: 700, fontSize: 15 }}>Ganancias mensuales {dashYear}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Comparar con:</span>
                    <select className="compare-select" value={compareMonth} onChange={e => setCompareMonth(Number(e.target.value))}>
                      <option value={-1}>Sin comparar</option>
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="chart-container">
                  {compareMonth === -1 ? (
                    <BarChart
                      data={MONTHS.map((m, i) => ({ label: m.slice(0, 3), a: getMonthIncome(i + 1, dashYear) }))}
                      valKeyA="a" colorA="#ffa333" legendA="Ingresos"
                    />
                  ) : (
                    <BarChart
                      data={[
                        { label: MONTHS[dashMonth - 1]?.slice(0, 3) || "?", a: getMonthIncome(dashMonth, dashYear), b: getMonthExpenses(dashMonth, dashYear) },
                        { label: MONTHS[compareMonth - 1]?.slice(0, 3) || "?", a: getMonthIncome(compareMonth, dashYear), b: getMonthExpenses(compareMonth, dashYear) }
                      ]}
                      valKeyA="a" valKeyB="b" colorA="#ffa333" colorB="#f87171"
                      legendA="Ingresos" legendB="Gastos"
                    />
                  )}
                </div>
              </div>

              {/* Expenses by category */}
              <div className="card">
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Gastos por categoría — {MONTHS[dashMonth - 1]} {dashYear}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                  {EXPENSE_CATEGORIES.map(cat => {
                    const catExpenses = expenses.filter(e => {
                      const my = getMonthYear(e.date);
                      return my && my.month === dashMonth && my.year === dashYear && e.category === cat;
                    });
                    const fixedCat = fixedExpenses.filter(e => e.active && e.category === cat);
                    const total = catExpenses.reduce((s, e) => s + (e.amount || 0), 0) + fixedCat.reduce((s, e) => s + (e.amount || 0), 0);
                    if (total === 0) return null;
                    return (
                      <div key={cat} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-xs text-muted" style={{ fontWeight: 600 }}>{cat}</div>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{formatMoney(total)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ==================== TRABAJOS ==================== */}
          {page === "jobs" && (
            <>
              <div className="page-header">
                <h1 className="page-title">Trabajos</h1>
                <button className="btn btn-primary" onClick={() => setJobModal("new")}>{Icons.plus} Nuevo trabajo</button>
              </div>

              <div className="filter-bar">
                <div className="search-box">
                  {Icons.search}
                  <input placeholder="Buscar cliente, servicio..." value={jobSearch} onChange={e => setJobSearch(e.target.value)} />
                </div>
                <select className="compare-select" value={jobMonthFilter} onChange={e => setJobMonthFilter(e.target.value)}>
                  <option value="all">Todos los meses</option>
                  {[2025, 2026, 2027].map(y => MONTHS.map((m, i) => (
                    <option key={`${y}-${i + 1}`} value={`${y}-${i + 1}`}>{m} {y}</option>
                  )))}
                </select>
                {["all", ...STATUS_ALL, "unpaid", "paid"].map(f => (
                  <button key={f} className={`filter-chip ${jobFilter === f ? "active" : ""}`} onClick={() => setJobFilter(f)}>
                    {f === "all" ? "Todos" : f === "unpaid" ? "Sin cobrar" : f === "paid" ? "Cobrados" : f}
                  </button>
                ))}
              </div>

              {jobFilter === "unpaid" && filteredUnpaidTotal != null && (
                <div className="card" style={{ background: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.2)", marginBottom: 16 }}>
                  <span style={{ fontWeight: 700, color: "var(--red)", fontSize: 15 }}>
                    Total pendiente de cobro: {formatMoney(filteredUnpaidTotal)} ({filteredJobs.length} trabajo{filteredJobs.length !== 1 ? "s" : ""})
                  </span>
                </div>
              )}

              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Pago</th>
                        <th>Cliente</th>
                        <th>Servicio</th>
                        <th>Dirección</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Valor</th>
                        <th>Estado</th>
                        <th>Medio</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.length === 0 && (
                        <tr><td colSpan={10} className="empty-state">No hay trabajos para mostrar</td></tr>
                      )}
                      {filteredJobs.map(j => (
                        <tr key={j.id} className={j.paid ? "paid-row" : ""}>
                          <td>
                            <span className="toggle-paid" onClick={() => togglePaid(j.id)} title={j.paid ? "Marcar como no pagado" : "Marcar como pagado"}>
                              {j.paid ? <span className="badge badge-paid">{Icons.check} Sí</span> : <span className="badge badge-unpaid">No</span>}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{j.clientName}</td>
                          <td>{j.serviceType}{j.serviceType === "Otros" && j.otherDetail ? ` (${j.otherDetail})` : ""}</td>
                          <td className="text-sm text-muted">{j.address}</td>
                          <td className="text-sm">{j.date?.split("-").reverse().join("/")}</td>
                          <td className="text-sm">{j.hour || "—"}</td>
                          <td style={{ fontWeight: 700 }}>{formatMoney(j.value)}</td>
                          <td>{statusBadge(j.status)}</td>
                          <td className="text-sm">{j.paymentMethod}</td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn-icon" onClick={() => setJobModal(j)} title="Editar">{Icons.edit}</button>
                              <button className="btn-icon" onClick={() => deleteJob(j.id)} title="Eliminar">{Icons.trash}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ==================== CALENDARIO ==================== */}
          {page === "calendar" && (() => {
            const firstDay = new Date(calYear, calMonth, 1);
            const lastDay = new Date(calYear, calMonth + 1, 0);
            const startDay = firstDay.getDay(); // 0=Sun
            const daysInMonth = lastDay.getDate();
            const cells = [];
            // Previous month filler
            for (let i = 0; i < startDay; i++) cells.push({ day: null, otherMonth: true });
            for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, otherMonth: false });
            // Next month filler
            while (cells.length % 7 !== 0) cells.push({ day: null, otherMonth: true });

            const todayStr = new Date().toISOString().slice(0, 10);

            return (
              <>
                <div className="page-header">
                  <h1 className="page-title">Calendario</h1>
                  <button className="btn btn-primary" onClick={() => setJobModal("new")}>{Icons.plus} Nuevo turno</button>
                </div>
                <div className="card">
                  <div className="flex items-center justify-between mb-2">
                    <button className="btn-icon" onClick={() => {
                      if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                      else setCalMonth(calMonth - 1);
                    }}>{Icons.chevLeft}</button>
                    <h3 style={{ fontWeight: 700, fontSize: 17 }}>{MONTHS[calMonth]} {calYear}</h3>
                    <button className="btn-icon" onClick={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                      else setCalMonth(calMonth + 1);
                    }}>{Icons.chevRight}</button>
                  </div>

                  <div className="flex gap-2 mb-2" style={{ fontSize: 11, fontWeight: 600 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,163,51,0.4)" }} /> Confirmado</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(250,204,21,0.4)" }} /> Pendiente</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(52,211,153,0.4)" }} /> Terminado</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(96,165,250,0.4)" }} /> Retiro</span>
                  </div>

                  <div className="calendar-grid">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(d => (
                      <div key={d} className="calendar-header-cell">{d}</div>
                    ))}
                    {cells.map((cell, i) => {
                      if (cell.otherMonth) return <div key={i} className="calendar-cell other-month" />;
                      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                      const isToday = dateStr === todayStr;
                      const dayJobs = jobs.filter(j => j.date === dateStr).sort((a, b) => (a.hour || "99:99").localeCompare(b.hour || "99:99"));
                      return (
                        <div key={i} className={`calendar-cell ${isToday ? "today" : ""}`} 
                          onClick={() => dayJobs.length > 0 && setSelectedDay(dateStr)}
                          style={{ cursor: dayJobs.length > 0 ? "pointer" : "default" }}>
                          <div className="calendar-day-num">{cell.day}</div>
                          {dayJobs.slice(0, 3).map(j => (
                            <div key={j.id} className={`calendar-event ${j.modality === "Retiramos nosotros" ? "retiro" : j.status === "Confirmado" ? "confirmed" : j.status === "Pendiente de confirmación" ? "pending" : j.status === "Terminado" ? "done" : "other-status"}`}
                              title={`${j.clientName} - ${j.serviceType} - ${formatMoney(j.value)}`}>
                              {j.hour || "s/h"} · {j.address || j.clientName}
                            </div>
                          ))}
                          {dayJobs.length > 3 && <div className="text-xs text-muted" style={{ paddingLeft: 5 }}>+{dayJobs.length - 3} más</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}

          {/* ==================== CLIENTES ==================== */}
          {page === "clients" && (
            <>
              <div className="page-header">
                <h1 className="page-title">Clientes</h1>
              </div>
              <div className="filter-bar">
                <div className="search-box">
                  {Icons.search}
                  <input placeholder="Buscar cliente..." value={jobSearch} onChange={e => setJobSearch(e.target.value)} />
                </div>
                <button className={`filter-chip ${clientSort === "desc" ? "active" : ""}`} onClick={() => setClientSort(clientSort === "desc" ? "none" : "desc")}>Mayor a menor</button>
                <button className={`filter-chip ${clientSort === "asc" ? "active" : ""}`} onClick={() => setClientSort(clientSort === "asc" ? "none" : "asc")}>Menor a mayor</button>
              </div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Trabajos</th><th style={{ cursor: "pointer" }} onClick={() => setClientSort(clientSort === "desc" ? "asc" : "desc")}>Total facturado {clientSort === "desc" ? "↓" : clientSort === "asc" ? "↑" : "↕"}</th><th></th></tr>
                    </thead>
                    <tbody>
                      {clients.filter(c => !jobSearch || c.name?.toLowerCase().includes(jobSearch.toLowerCase())).map(c => {
                        const clientJobs = jobs.filter(j => 
                          j.clientName?.toLowerCase() === c.name?.toLowerCase() && 
                          (j.address || "").toLowerCase() === (c.address || "").toLowerCase()
                        );
                        const totalBilled = clientJobs.reduce((s, j) => s + (j.value || 0), 0);
                        return { ...c, clientJobs, totalBilled };
                      }).sort((a, b) => {
                        if (clientSort === "asc") return a.totalBilled - b.totalBilled;
                        if (clientSort === "desc") return b.totalBilled - a.totalBilled;
                        return 0;
                      }).map(c => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                            <td className="text-sm">{c.phone || "—"}</td>
                            <td className="text-sm text-muted">{c.address || "—"}</td>
                            <td>{c.clientJobs.length}</td>
                            <td style={{ fontWeight: 700 }}>{formatMoney(c.totalBilled)}</td>
                            <td>
                              <div className="flex gap-2">
                                <button className="btn btn-secondary btn-sm" onClick={() => setClientModal(c)}>Ver historial</button>
                                <button className="btn-icon" onClick={() => deleteClient(c.id)} title="Eliminar cliente">{Icons.trash}</button>
                              </div>
                            </td>
                          </tr>
                      ))}
                      {clients.length === 0 && <tr><td colSpan={6} className="empty-state">Los clientes se crean automáticamente al cargar trabajos</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ==================== GASTOS ==================== */}
          {page === "expenses" && (
            <>
              <div className="page-header">
                <h1 className="page-title">Gastos</h1>
                <button className="btn btn-primary" onClick={() => setExpenseModal("new")}>{Icons.plus} Nuevo gasto</button>
              </div>

              {/* Fixed expenses */}
              {fixedExpenses.length > 0 && (
                <div className="card">
                  <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Gastos fijos mensuales</h3>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Categoría</th><th>Descripción</th><th>Monto</th><th>Activo</th><th></th></tr></thead>
                      <tbody>
                        {fixedExpenses.map(e => (
                          <tr key={e.id} style={{ opacity: e.active ? 1 : 0.5 }}>
                            <td style={{ fontWeight: 600 }}>{e.category}{e.category === "Otros" && e.otherDetail ? ` (${e.otherDetail})` : ""}</td>
                            <td className="text-sm">{e.description || "—"}</td>
                            <td style={{ fontWeight: 700 }}>{formatMoney(e.amount)}</td>
                            <td>
                              <span className="toggle-paid" onClick={() => toggleFixedExpense(e.id)}>
                                {e.active ? <span className="badge badge-paid">Activo</span> : <span className="badge badge-unpaid">Inactivo</span>}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button className="btn-icon" onClick={() => setExpenseModal(e)}>{Icons.edit}</button>
                                <button className="btn-icon" onClick={() => deleteExpense(e.id, true)}>{Icons.trash}</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-sm" style={{ fontWeight: 700 }}>
                    Total fijo mensual: {formatMoney(fixedExpenses.filter(e => e.active).reduce((s, e) => s + (e.amount || 0), 0))}
                  </div>
                </div>
              )}

              {/* Variable expenses */}
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px 0" }}>
                  <h3 style={{ fontWeight: 700, fontSize: 15 }}>Gastos variables</h3>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th></th></tr></thead>
                    <tbody>
                      {expenses.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(e => (
                        <tr key={e.id}>
                          <td className="text-sm">{e.date?.split("-").reverse().join("/")}</td>
                          <td style={{ fontWeight: 600 }}>{e.category}{e.category === "Otros" && e.otherDetail ? ` (${e.otherDetail})` : ""}</td>
                          <td className="text-sm">{e.description || "—"}</td>
                          <td style={{ fontWeight: 700, color: "var(--red)" }}>{formatMoney(e.amount)}</td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn-icon" onClick={() => setExpenseModal(e)}>{Icons.edit}</button>
                              <button className="btn-icon" onClick={() => deleteExpense(e.id, false)}>{Icons.trash}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && <tr><td colSpan={5} className="empty-state">No hay gastos variables registrados</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>

        {/* ==================== MODALS ==================== */}
        <Modal isOpen={jobModal != null} onClose={() => setJobModal(null)} title={jobModal && jobModal.id ? "Editar trabajo" : "Nuevo trabajo"}>
          <JobForm
            job={jobModal && jobModal.id ? jobModal : null}
            clients={clients}
            onSave={handleSaveJob}
            onCancel={() => setJobModal(null)}
          />
        </Modal>

        <Modal isOpen={expenseModal != null} onClose={() => setExpenseModal(null)} title={expenseModal && expenseModal.id ? "Editar gasto" : "Nuevo gasto"}>
          <ExpenseForm
            expense={expenseModal && expenseModal.id ? expenseModal : null}
            onSave={handleSaveExpense}
            onCancel={() => setExpenseModal(null)}
          />
        </Modal>

        <Modal isOpen={clientModal != null} onClose={() => setClientModal(null)} title={`Historial — ${clientModal?.name || ""}`}>
          {clientModal && (() => {
            const clientJobs = jobs.filter(j => 
              j.clientName?.toLowerCase() === clientModal.name?.toLowerCase() && 
              (j.address || "").toLowerCase() === (clientModal.address || "").toLowerCase()
            ).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
            return (
              <>
                <div className="text-sm text-muted mb-2">Tel: {clientModal.phone || "—"} · Dir: {clientModal.address || "—"}</div>
                {clientJobs.length === 0 ? <div className="empty-state">Sin trabajos registrados</div> : (
                  clientJobs.map(j => (
                    <div key={j.id} className="client-history-item">
                      <div className="flex items-center justify-between">
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{j.serviceType}</span>
                        <span style={{ fontWeight: 700 }}>{formatMoney(j.value)}</span>
                      </div>
                      <div className="text-xs text-muted mt-2">
                        {j.date?.split("-").reverse().join("/")} · {j.modality} · {j.paid ? "✅ Pagado" : "⏳ Pendiente de pago"}
                      </div>
                      {j.description && <div className="text-xs mt-2" style={{ color: "#6b7280" }}>{j.description}</div>}
                    </div>
                  ))
                )}
              </>
            );
          })()}
        </Modal>

        <Modal isOpen={selectedDay != null} onClose={() => setSelectedDay(null)} title={selectedDay ? `Turnos — ${selectedDay.split("-").reverse().join("/")}` : ""}>
          {selectedDay && (() => {
            const dayJobs = jobs.filter(j => j.date === selectedDay).sort((a, b) => (a.hour || "99:99").localeCompare(b.hour || "99:99"));
            return dayJobs.length === 0 ? <div className="empty-state">Sin turnos este día</div> : (
              dayJobs.map(j => (
                <div key={j.id} className="client-history-item">
                  <div className="flex items-center justify-between">
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{j.hour || "Sin hora"}</span>
                    {statusBadge(j.status)}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>{j.clientName || "Sin nombre"}</div>
                  <div className="text-sm text-muted" style={{ marginTop: 2 }}>{j.address || "Sin dirección"}</div>
                  <div className="text-sm" style={{ marginTop: 4 }}>{j.serviceType}{j.serviceType === "Otros" && j.otherDetail ? ` (${j.otherDetail})` : ""}</div>
                  {j.description && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{j.description}</div>}
                  <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                    <span style={{ fontWeight: 700 }}>{formatMoney(j.value)}</span>
                    <span>{j.paid ? <span className="badge badge-paid">{Icons.check} Pagado</span> : <span className="badge badge-unpaid">Pendiente</span>}</span>
                  </div>
                </div>
              ))
            );
          })()}
        </Modal>
      </div>
    </>
  );
}
