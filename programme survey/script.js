const form = document.getElementById("surveyForm");
const statusEl = document.getElementById("status");

// ✅ Your deployed Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyIBJcQDNyNlWXMTVWNxAnFi0RwvMftLhTLR87_FuJRBWuyryxtC7jxkKWEqJ_Cm9Me/exec";


// Populate the school datalist from window.SCHOOL_DATA on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // populate datalist from your reference.js
  const dl = document.getElementById('schoolList');
  if (dl && window.SCHOOL_DATA) {
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
    const names = [...new Set(window.SCHOOL_DATA
      .map(s => s.school?.trim())
      .filter(Boolean))].sort(collator.compare);

    names.forEach(n => dl.insertAdjacentHTML('beforeend', `<option value="${n}">`));
  }
});

// helper to ensure value is from the preset list
function isValidSchool() {
  const val = document.getElementById('school').value.trim();
  const allowed = new Set([...document.querySelectorAll('#schoolList option')].map(o => o.value));
  return allowed.has(val);
}

// ========= SUBMIT =========
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Submitting…";

  // collect all fields (merge checkbox groups to CSV)
  const fd = new FormData(form);
  const payload = {};
  fd.forEach((v, k) => {
    if (payload[k]) {
      if (!Array.isArray(payload[k])) payload[k] = [payload[k]];
      payload[k].push(v);
    } else {
      payload[k] = v;
    }
  });
  // flatten arrays + add common aliases (so your GAS can read either style)
  Object.keys(payload).forEach(k => {
    if (Array.isArray(payload[k])) payload[k] = payload[k].join(", ");
    payload[k.toLowerCase()] = payload[k];
    payload[k.replace(/[()]/g,"").replace(/\s+/g,"_").toLowerCase()] = payload[k];
  });

  // ensure GAS-friendly aliases
  if (payload.school && !('School' in payload)) payload['School'] = payload.school;

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.result !== "success") {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    statusEl.textContent = "Submitted. Thank you!";
    form.reset();
    document.getElementById("consultantInfo")?.setAttribute("hidden", "");
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Submission failed. Please try again.";
  }
});

// ========= COLLECT & NORMALIZE =========
function buildPayload(formEl) {
  const fields = Array.from(formEl.elements).filter(el => el.name && !el.disabled);
  const grouped = {};

  // gather all values
  for (const el of fields) {
    const n = el.name;
    if (el.type === "checkbox") {
      if (!grouped[n]) grouped[n] = [];
      if (el.checked) grouped[n].push(el.value);
    } else if (el.type === "radio") {
      if (el.checked) grouped[n] = el.value.trim();
    } else {
      grouped[n] = (el.value || "").trim();
    }
  }
  // flatten checkboxes to comma-separated
  Object.keys(grouped).forEach(k => {
    if (Array.isArray(grouped[k])) grouped[k] = grouped[k].join(", ");
  });

  // create multiple key variants so either server style works
  const KEY_ALIASES = {
    "Name": ["name"],
    "Email": ["email"],
    "School": ["school"],
    "Role": ["role"],
    "Role_Other": ["role_other","roleOther"],
    "Subject Area(s)": ["subjects","subject_areas"],
    "Priority Areas": ["priority","priority_areas"],
    "Priority_Areas_Other": ["priority_other"],
    "Challenges": ["challenges"],
    "Student Levels": ["student_levels"],
    "Preferred Format": ["preferred_format"],
    "Duration": ["duration"],
    "Schedule": ["schedule"],
    "Group Size": ["group_size"],
    "Focus Request": ["focus_request"],
    "Comments": ["comments"]
  };
  const canon = s =>
    s.toLowerCase()
     .replace(/[()]/g,"")
     .replace(/\s*\/\s*/g,"_")
     .replace(/\s+/g,"_")
     .replace(/_+/g,"_");

  const data = {};
  for (const [orig, val] of Object.entries(grouped)) {
    data[orig] = val;                 // original (e.g., "Subject Area(s)")
    data[orig.toLowerCase()] = val;   // lowercase with spaces
    data[canon(orig)] = val;          // canonical snake_case
    const aliases = KEY_ALIASES[orig] || [];
    for (const a of aliases) data[a] = val;
  }
  return data;
}


// ----------------------
// Conditional "Others" fields
// ----------------------

// Role dropdown
const roleSelect = document.getElementById("roleSelect");
const roleOther = document.getElementById("roleOther");

if (roleSelect && roleOther) {
  roleSelect.addEventListener("change", () => {
    if (roleSelect.value === "Others") {
      roleOther.style.display = "block";
      roleOther.required = true;
    } else {
      roleOther.style.display = "none";
      roleOther.value = "";
      roleOther.required = false;
    }
  });
}

// Priority Areas checkbox
const priorityOtherChk = document.getElementById("priorityOtherChk");
const priorityOther = document.getElementById("priorityOther");

if (priorityOtherChk && priorityOther) {
  priorityOtherChk.addEventListener("change", () => {
    if (priorityOtherChk.checked) {
      priorityOther.style.display = "block";
      priorityOther.required = true;
    } else {
      priorityOther.style.display = "none";
      priorityOther.value = "";
      priorityOther.required = false;
    }
  });
}

// Known consultant contacts
const CONSULTANT_CONTACTS = {
  MARTIN:  { name: 'Martin Lock',   phone: '9696 6614', email: 'martin@vivarch.com.sg' },
  SARAH:   { name: 'Sarah Kadir',   phone: '8915 6929', email: 'sarah@vivarch.com.sg' },
  KRYSTLE: { name: 'Krystle Choo',  phone: '8181 6482', email: 'krystle@vivarch.com.sg' },
  SAPNAA:  { name: 'R Sapnaa',      phone: '8181 1140',    email: 'sapnaa@vivarch.com.sg' },
  CHARLYNN:{ name: 'Charlynn Yan',  phone: '8585 8444', email: 'charlynn@vivarch.com.sg' },
  YUNIZA:  { name: 'Yuniza Khoo',   phone: '9169 1219', email: 'yuniza@vivarch.com.sg' }
};

// Look up consultant for a school from reference.js
function getConsultantBySchool(schoolName){
  if (!window.SCHOOL_DATA) return null;
  const rec = window.SCHOOL_DATA.find(
    s => (s.school || '').trim().toLowerCase() === (schoolName || '').trim().toLowerCase()
  );
  const raw = rec && (rec.consultant || rec.Consultant || '').trim();
  return raw || null;
}

// Render panel
function updateConsultantInfo(){
  const panel = document.getElementById('consultantInfo');
  const schoolEl = document.getElementById('school'); // works for <input list> or <select>
  const val = schoolEl ? (schoolEl.value || schoolEl.options?.[schoolEl.selectedIndex]?.value || '') : '';
  if (!val){ panel.hidden = true; panel.textContent=''; return; }

  const consultantRaw = getConsultantBySchool(val);

  // if consultantRaw is falsy (empty/null), we'll fall back to SAPNAA below
  // do not early-return here so the fallback can be applied
  const effective = (consultantRaw || 'Sapnaa');
  const key = effective.toUpperCase().split(' ')[0]; // "MARTIN", "SARAH", "KRYSTLE", etc.
  const info = CONSULTANT_CONTACTS[key] || CONSULTANT_CONTACTS.SAPNAA || { name: effective, phone: '', email: '' };

  panel.innerHTML =
    `Feel free to contact <strong>${info.name}</strong> (Education Consultant) ` +
    `via phone <a href="tel:${info.phone.replace(/\s+/g,'')}">${info.phone}</a> ` +
    `or email at <a href="mailto:${info.email}">${info.email}</a>.`;
  panel.hidden = false;
}

// Wire up events
document.addEventListener('DOMContentLoaded', () => {
  // populate datalist from your reference.js
  const schoolEl = document.getElementById('school');
  if (schoolEl){
    ['input','change','blur'].forEach(ev => schoolEl.addEventListener(ev, updateConsultantInfo));
  }
});
