import {
  calculateCapacity, calculateRooms, calculateEconomics,
  calculateLease, calculateCompute,
} from './model.mjs';

const SCENARIO_KEY = 'aura-civic-scenario-v1';
const GUIDE_KEY = 'aura-civic-guide-v1';
const MAX_JSON_BYTES = 100 * 1024;
const DEFAULT_PROGRAMMES = ['resilience', 'women', 'teaching'];
const FALLBACK_INPUTS = {
  capacity: { area: 5000, supportPercent: 30, areaPerPerson: 12, desks: 50, openHours: 24, openDays: 7, availabilityPercent: 80, bookingPercent: 60, hoursPerMember: 10 },
  rooms: { rooms: 4, openHours: 24, openDays: 7, availabilityPercent: 80, bookingPercent: 60, sessionHours: 2, turnoverMinutes: 15, peoplePerSession: 12 },
  economics: { premisesMonthly: 25000, staffFte: 8, loadedAnnualSalary: 100000, otherAnnual: 180000, capital: 300000, renewalYears: 5, contractAnnual: 600000, memberMonthly: 60, feePayingMembers: 300 },
  lease: { baseAnnual: 5800000, increasePercent: 4, year: 3, term: 15 },
  compute: { nodes: 1, capitalPerNode: 6000000, ratedKw: 120, utilisationPercent: 60, pue: 1.2, electricityPerKwh: 0.25 },
};
const calculators = {
  capacity: calculateCapacity, rooms: calculateRooms, economics: calculateEconomics,
  lease: calculateLease, compute: calculateCompute,
};
const number = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('en-AU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
const dollars = new Set([
  'premisesAnnual', 'staffAnnual', 'renewalAnnual', 'operatingAnnual', 'totalAnnual',
  'memberAnnual', 'incomeAnnual', 'securedIncomeAnnual', 'fundingGapAnnual', 'surplusAnnual',
  'monthlyGap', 'annual', 'monthly', 'cumulativeTerm', 'capital', 'annualElectricity',
]);
const forms = [...document.querySelectorAll('form[data-calculator]')]
  .filter((form) => Object.hasOwn(calculators, form.dataset.calculator));
const programmeControls = [...document.querySelectorAll('[data-programme]')];
const bounds = {};
let defaults = { version: 1, inputs: copyInputs(FALLBACK_INPUTS), programmes: [...DEFAULT_PROGRAMMES] };
let scenario;
let programmes = [];
let storageAvailable = true;

function copyInputs(inputs) {
  return Object.fromEntries(Object.entries(inputs).map(([name, values]) => [name, { ...values }]));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function byteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}

function storageRead(key) {
  try { return localStorage.getItem(key); } catch { storageAvailable = false; return null; }
}

function storageWrite(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { storageAvailable = false; return false; }
}

function setStatus(message, selectableUrl = '') {
  for (const status of document.querySelectorAll('[data-scenario-status]')) {
    status.replaceChildren();
    status.append(document.createTextNode(message));
    if (selectableUrl) {
      const field = document.createElement('textarea');
      field.value = selectableUrl;
      field.readOnly = true;
      field.rows = 3;
      field.setAttribute('aria-label', 'Scenario link to copy');
      field.style.cssText = 'display:block;width:100%;margin-top:.75rem;padding:.75rem;overflow-wrap:anywhere;';
      status.append(field);
      field.addEventListener('focus', () => field.select());
    }
  }
}

function defineBounds() {
  for (const [form, values] of Object.entries(FALLBACK_INPUTS)) {
    bounds[form] = Object.fromEntries(Object.keys(values).map((key) => [key, { min: 0, max: Infinity }]));
    for (const key of ['supportPercent', 'availabilityPercent', 'bookingPercent', 'utilisationPercent']) {
      if (bounds[form][key]) bounds[form][key].max = 100;
    }
    if (bounds[form].openHours) bounds[form].openHours.max = 24;
    if (bounds[form].openDays) bounds[form].openDays.max = 7;
  }
  bounds.capacity.areaPerPerson.min = 0.5;
  bounds.capacity.hoursPerMember.min = 0.5;
  bounds.rooms.sessionHours.min = 0.25;
  bounds.economics.renewalYears.min = 1;
  bounds.lease.year.min = 1;
  bounds.lease.year.max = 50;
  bounds.lease.term.min = 1;
  bounds.lease.term.max = 50;
  bounds.compute.pue.min = 1;
  for (const form of forms) {
    for (const input of form.querySelectorAll('input[name]')) {
      const field = bounds[form.dataset.calculator][input.name];
      if (!field) continue;
      if (input.hasAttribute('min') && Number.isFinite(Number(input.min))) field.min = Number(input.min);
      if (input.hasAttribute('max') && Number.isFinite(Number(input.max))) field.max = Number(input.max);
    }
  }
}

function validProgrammeIds() {
  return new Set(programmes.length ? programmes.map((programme) => programme.id) : [
    'welcome', 'resilience', 'women', 'youth', 'teaching', 'support', 'creative', 'models',
  ]);
}

function validatePack(value) {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.inputs)) {
    throw new Error('Use a version 1 scenario JSON file.');
  }
  const inputs = copyInputs(defaults.inputs);
  for (const [form, fields] of Object.entries(bounds)) {
    if (!Object.hasOwn(value.inputs, form)) continue;
    if (!isRecord(value.inputs[form])) throw new Error(`The ${form} inputs must be a numeric object.`);
    for (const [name, range] of Object.entries(fields)) {
      if (!Object.hasOwn(value.inputs[form], name)) continue;
      const entry = value.inputs[form][name];
      if (typeof entry !== 'number' || !Number.isFinite(entry) || entry < range.min || entry > range.max) {
        throw new Error(`Check ${form}: ${name} must be a finite number within the calculator limits.`);
      }
      inputs[form][name] = entry;
    }
  }
  const known = validProgrammeIds();
  let selected = [...defaults.programmes];
  if (Object.hasOwn(value, 'programmes')) {
    if (!Array.isArray(value.programmes)) throw new Error('Programme selections must be a list.');
    selected = [...new Set(value.programmes.filter((id) => typeof id === 'string' && known.has(id)))];
  }
  return { version: 1, inputs, programmes: selected };
}

function parsePack(text) {
  if (typeof text !== 'string' || byteLength(text) > MAX_JSON_BYTES) {
    throw new Error('Choose a scenario smaller than 100 KB.');
  }
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('The scenario must contain valid JSON.'); }
  return validatePack(value);
}

function pack() {
  return { version: 1, inputs: copyInputs(scenario.inputs), programmes: [...scenario.programmes] };
}

function persistScenario() {
  const saved = storageWrite(SCENARIO_KEY, JSON.stringify(pack()));
  if (!saved) setStatus('Device storage is unavailable. Save a scenario file to keep these inputs.');
  return saved;
}

function clearScenarioQuery() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('scenario')) return;
    url.searchParams.delete('scenario');
    window.history.replaceState(null, '', url);
  } catch { /* Scenario files remain available if URL updates are restricted. */ }
}

function formatOutput(key, value, inputs, result) {
  if (key === 'breakEvenMembers' && inputs.memberMonthly === 0 && result.totalAnnual > 0) return 'Enter a fee';
  if (!Number.isFinite(value)) return 'Check inputs';
  if (dollars.has(key)) return money.format(value);
  if (key === 'memberEquivalents' || key === 'sessionEquivalents') return decimal.format(value);
  if (key === 'totalPowerKw') return `${decimal.format(value)} kW`;
  if (key === 'annualKwh') return `${number.format(value)} kWh`;
  if (key === 'programmeArea') return `${number.format(value)} m²`;
  return number.format(value);
}

function renderCalculator(name) {
  const result = calculators[name](scenario.inputs[name]);
  for (const output of document.querySelectorAll(`[data-results="${name}"] [data-output]`)) {
    if (Object.hasOwn(result, output.dataset.output)) {
      output.textContent = formatOutput(output.dataset.output, result[output.dataset.output], scenario.inputs[name], result);
    }
  }
}

function formNote(form, message) {
  let note = form.querySelector('[data-calculator-validation]');
  if (!note) {
    note = document.createElement('p');
    note.dataset.calculatorValidation = '';
    note.id = `${form.dataset.calculator}-validation`;
    note.className = 'small';
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    form.append(note);
  }
  note.textContent = message;
  note.hidden = !message;
  return note;
}

function readForm(form) {
  const name = form.dataset.calculator;
  const values = { ...scenario.inputs[name] };
  let message = '';
  for (const input of form.querySelectorAll('input[name]')) {
    if (!Object.hasOwn(bounds[name], input.name)) continue;
    const value = input.value.trim() === '' ? NaN : Number(input.value);
    const range = bounds[name][input.name];
    let problem = '';
    if (!Number.isFinite(value)) problem = 'Enter a number to update this calculation.';
    else if (value < range.min || value > range.max) {
      if (value <= 0 && ['areaPerPerson', 'hoursPerMember', 'sessionHours', 'renewalYears', 'pue'].includes(input.name)) {
        problem = 'Enter a positive value.';
      } else {
        problem = Number.isFinite(range.max)
          ? `Enter a value from ${range.min} to ${range.max}.`
          : `Enter a value of at least ${range.min}.`;
      }
    }
    input.setCustomValidity(problem);
    if (problem) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `${name}-validation`);
      if (!message) message = problem;
    } else {
      input.removeAttribute('aria-invalid');
      if (input.getAttribute('aria-describedby') === `${name}-validation`) input.removeAttribute('aria-describedby');
      values[input.name] = value;
    }
  }
  if (!message && name === 'rooms' && values.sessionHours + values.turnoverMinutes / 60 <= 0) message = 'Enter a positive value for the session cycle.';
  formNote(form, message ? `${message} Results update when the inputs are valid.` : '');
  if (message) {
    for (const output of document.querySelectorAll(`[data-results="${name}"] [data-output]`)) output.textContent = '—';
    return null;
  }
  return values;
}

function applyScenario() {
  for (const form of forms) {
    const name = form.dataset.calculator;
    for (const input of form.querySelectorAll('input[name]')) {
      if (!Object.hasOwn(scenario.inputs[name], input.name)) continue;
      input.value = scenario.inputs[name][input.name];
      input.setCustomValidity('');
      input.removeAttribute('aria-invalid');
      if (input.getAttribute('aria-describedby') === `${name}-validation`) input.removeAttribute('aria-describedby');
    }
    formNote(form, '');
    renderCalculator(name);
  }
  for (const control of programmeControls) control.checked = scenario.programmes.includes(programmeId(control));
  renderOverlaps();
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function wireCalculators() {
  const readyToExport = () => {
    let valid = true;
    for (const form of forms) if (!readForm(form)) valid = false;
    if (!valid) setStatus('Check the highlighted calculator inputs before saving or sharing this scenario.');
    return valid;
  };
  for (const form of forms) {
    form.addEventListener('submit', (event) => event.preventDefault());
    form.addEventListener('input', () => {
      const values = readForm(form);
      if (!values) return;
      scenario.inputs[form.dataset.calculator] = values;
      renderCalculator(form.dataset.calculator);
      clearScenarioQuery();
      if (persistScenario()) setStatus('Scenario inputs saved on this device.');
    });
  }
  for (const button of document.querySelectorAll('[data-save]')) button.addEventListener('click', () => {
    if (!readyToExport()) return;
    downloadJson('aura-civic-scenario-v1.json', pack());
    setStatus('Scenario file prepared with all five calculators and selected programmes.');
  });
  for (const button of document.querySelectorAll('[data-share]')) button.addEventListener('click', async () => {
    if (!readyToExport()) return;
    const url = new URL(window.location.href);
    url.searchParams.set('scenario', JSON.stringify(pack()));
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url.href);
      setStatus('Scenario link copied. It contains the planning inputs and selected programmes.');
    } catch { setStatus('Select and copy this scenario link:', url.href); }
  });
  const fileInput = document.querySelector('[data-import-file]');
  for (const button of document.querySelectorAll('[data-import]')) button.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_JSON_BYTES) throw new Error('Choose a scenario smaller than 100 KB.');
      scenario = parsePack(await file.text());
      applyScenario();
      clearScenarioQuery();
      const saved = persistScenario();
      setStatus(saved ? 'Scenario loaded and saved on this device.' : 'Scenario loaded. Device storage is unavailable; keep your scenario file.');
    } catch (error) { setStatus(`Scenario not loaded. ${error.message}`); }
    finally { fileInput.value = ''; }
  });
  for (const button of document.querySelectorAll('[data-reset]')) button.addEventListener('click', () => {
    scenario = { version: 1, inputs: copyInputs(defaults.inputs), programmes: [...DEFAULT_PROGRAMMES] };
    applyScenario();
    clearScenarioQuery();
    const saved = persistScenario();
    setStatus(saved ? 'All five calculators and programme selections reset to the illustrative defaults.' : 'Defaults restored. Device storage is unavailable.');
  });
}

function programmeId(control) {
  return control.dataset.programme || control.value;
}

function element(tag, text, className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function renderOverlaps() {
  const output = document.querySelector('[data-overlap-result]');
  if (!output || programmes.length === 0) return;
  const selected = programmes.filter((programme) => scenario.programmes.includes(programme.id));
  output.replaceChildren();
  if (!selected.length) {
    output.append(element('h3', 'Choose a useful combination'), element('p', 'Select activities to compare their shared rooms, equipment and support.'));
    return;
  }
  const resources = new Map();
  for (const programme of selected) {
    for (const space of new Set(programme.spaces)) {
      if (!resources.has(space)) resources.set(space, []);
      resources.get(space).push(programme.title);
    }
  }
  const shared = [...resources].filter(([, users]) => users.length >= 2).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const individual = [...resources].filter(([, users]) => users.length === 1).sort((a, b) => a[0].localeCompare(b[0]));
  output.append(
    element('h3', `${selected.length} selected ${selected.length === 1 ? 'activity' : 'activities'}, ${resources.size} distinct resources`),
    element('p', selected.map((programme) => programme.title).join(' · ')),
    element('h4', `${shared.length} resources shared by two or more activities`),
  );
  if (shared.length) {
    const list = element('ul', '', 'shared-resources');
    for (const [space, users] of shared) {
      const item = element('li', '');
      item.append(element('b', `${space} · ${users.length} activities`), element('p', users.join('; ')));
      list.append(item);
    }
    output.append(list);
  } else output.append(element('p', 'This selection has no common resource yet. Add another activity to compare.'));
  if (individual.length) {
    output.append(element('h4', `${individual.length} resources used by one selected activity`));
    const list = element('ul', '', 'individual-resources');
    for (const [space, users] of individual) list.append(element('li', `${space} · ${users[0]}`));
    output.append(list);
  }
  output.append(element('p', 'A shared resource is counted once. Suitable rooms, activity hosts and a workable timetable still shape the combination.', 'small'));
}

function wireProgrammes() {
  for (const control of programmeControls) control.addEventListener('change', () => {
    scenario.programmes = [...new Set(programmeControls.filter((item) => item.checked).map(programmeId))];
    renderOverlaps();
    clearScenarioQuery();
    persistScenario();
  });
}

function wireDaySwitch() {
  const rhythms = {
    morning: ['A morning for learning and introductions', 'Bookable teaching rooms, mentor conversations, personal-Aura introductions and shared desks. Each activity brings an identified host and a workable handover.'],
    afternoon: ['An afternoon for building and connecting', 'Project teams, practical learning and enterprise conversations can share rooms and equipment. Bookings include preparation, pack-down and time to hand the space to the next activity.'],
    evening: ['An evening for making and gathering', 'Adult learning, creative work and hosted gatherings can fit around daytime commitments. Active and quiet uses need suitable rooms, clear access arrangements and an identified host.'],
    night: ['A night for focus and upkeep', 'Booked focused work, technical operations and maintenance can use quieter hours. Programme services keep their own staffed hours, with access and support matched to each activity.'],
  };
  for (const button of document.querySelectorAll('[data-day]')) button.addEventListener('click', () => {
    const value = rhythms[button.dataset.day];
    const output = document.querySelector('[data-day-result]');
    if (!value || !output) return;
    for (const other of document.querySelectorAll('[data-day]')) other.setAttribute('aria-pressed', String(other === button));
    output.replaceChildren(element('h3', value[0]), element('p', value[1]));
  });
}

function wireSourceFilters() {
  const query = document.querySelector('[data-source-query]');
  const kind = document.querySelector('[data-source-kind]');
  const items = [...document.querySelectorAll('[data-source-item]')];
  if (!items.length) return;
  const filter = () => {
    const terms = (query?.value ?? '').trim().toLocaleLowerCase('en-AU').split(/\s+/).filter(Boolean);
    const selectedKind = kind?.value ?? '';
    let shown = 0;
    for (const item of items) {
      const text = (item.dataset.search || item.textContent).toLocaleLowerCase('en-AU');
      const match = (!selectedKind || selectedKind === 'all' || item.dataset.kind === selectedKind) && terms.every((term) => text.includes(term));
      item.hidden = !match;
      if (match) shown++;
    }
    for (const count of document.querySelectorAll('[data-source-count]')) count.textContent = `${shown} of ${items.length} sources shown`;
    for (const empty of document.querySelectorAll('[data-source-empty]')) empty.hidden = shown !== 0;
  };
  query?.addEventListener('input', filter);
  kind?.addEventListener('change', filter);
  filter();
}

function wireAccess() {
  const person = document.querySelector('[data-access-person]');
  const space = document.querySelector('[data-access-space]');
  const output = document.querySelector('[data-access-result]');
  if (!person || !space || !output) return;
  const update = () => {
    let title;
    let explanation;
    if (space.value === 'compute') {
      title = 'Technical operator access';
      explanation = 'An engineered equipment area would need operator authorisation, equipment competence and a recorded technical role. A membership or hosted visit alone would not establish permission to operate the equipment.';
    } else if (space.value === 'workshop') {
      title = 'Activity-host permission';
      explanation = 'An identified activity host would agree the equipment, induction, supervision and room booking. Visitors could participate through that hosted activity, with permissions matched to the work.';
    } else if (person.value === 'guest' || space.value === 'public') {
      title = 'Hosted visit';
      explanation = 'A welcome or activity host would arrange the visit, confirm who is expected and explain the spaces included. A public introduction would not automatically include every room or service.';
    } else {
      title = 'Booking plus member access';
      explanation = 'The proposed model combines an agreed member identity with a suitable room or desk booking. Quiet spaces may need additional privacy arrangements, and each provider would set its own service hours.';
    }
    output.replaceChildren(element('h3', title), element('p', explanation), element('p', 'Illustrative access policy for discussion. This page does not verify identity, collect identity documents or operate building access.', 'small'));
  };
  person.addEventListener('change', update);
  space.addEventListener('change', update);
  update();
}

function wireGuide() {
  const checks = [...document.querySelectorAll('[data-guide-check]')];
  if (!checks.length) return;
  const guideStatus = (message) => {
    for (const status of document.querySelectorAll('[data-guide-status]')) status.textContent = message;
  };
  const id = (check, index) => check.dataset.guideCheck || check.id || (check.value !== 'on' ? check.value : `item-${index + 1}`);
  const items = () => checks.map((check, index) => ({
    id: id(check, index),
    text: (check.closest('label')?.textContent || check.getAttribute('aria-label') || `Item ${index + 1}`).replace(/\s+/g, ' ').trim(),
    done: check.checked,
  }));
  try {
    const stored = storageRead(GUIDE_KEY);
    if (stored && byteLength(stored) <= MAX_JSON_BYTES) {
      const saved = JSON.parse(stored);
      if (saved.version === 1 && Array.isArray(saved.done)) {
        for (const [index, check] of checks.entries()) check.checked = saved.done.includes(id(check, index));
      }
    }
  } catch { /* An unreadable local checklist leaves the readable default intact. */ }
  const update = (save = false) => {
    const reviewed = checks.filter((check) => check.checked).length;
    for (const count of document.querySelectorAll('[data-guide-count]')) {
      count.textContent = `${reviewed} of ${checks.length} reviewed`;
      count.setAttribute('aria-live', 'polite');
    }
    for (const progress of document.querySelectorAll('[data-guide-progress]')) {
      progress.style.width = `${reviewed / checks.length * 100}%`;
      const track = progress.closest('[role="progressbar"]') || progress.parentElement;
      track.removeAttribute('aria-hidden');
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', 'Site brief review');
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', String(checks.length));
      track.setAttribute('aria-valuenow', String(reviewed));
    }
    if (save) {
      const saved = storageWrite(GUIDE_KEY, JSON.stringify({ version: 1, done: items().filter((item) => item.done).map((item) => item.id) }));
      guideStatus(saved ? 'Checklist saved on this device.' : 'Device storage is unavailable. Export a checklist file to keep these choices.');
    }
  };
  for (const check of checks) check.addEventListener('change', () => update(true));
  for (const button of document.querySelectorAll('[data-guide-export]')) button.addEventListener('click', () => {
    const reviewed = items();
    downloadJson('aura-civic-site-brief-review.json', { version: 1, reviewedCount: reviewed.filter((item) => item.done).length, total: reviewed.length, items: reviewed });
    guideStatus('Checklist file prepared with the reviewed count and each item’s status.');
  });
  update();
}

function wireNavigation() {
  const menus = [...document.querySelectorAll('details.all-pages')];
  document.addEventListener('click', (event) => {
    for (const menu of menus) if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = menus.filter((menu) => menu.open);
    if (!open.length) return;
    for (const menu of open) menu.open = false;
    open[0].querySelector('summary')?.focus();
    event.preventDefault();
  });
  for (const button of document.querySelectorAll('[data-print]')) button.addEventListener('click', () => window.print());
}

async function fetchData(path) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(new URL(path, import.meta.url), { signal: controller.signal });
    if (!response.ok) throw new Error('Planning data unavailable');
    return await response.json();
  } finally { window.clearTimeout(timer); }
}

async function initialise() {
  defineBounds();
  wireNavigation();
  wireDaySwitch();
  wireSourceFilters();
  wireAccess();
  wireGuide();
  const loaded = await Promise.allSettled([
    fetchData('../data/default-results.json'), fetchData('../data/programmes.json'),
  ]);
  if (loaded[1].status === 'fulfilled' && Array.isArray(loaded[1].value)) {
    programmes = loaded[1].value.filter((programme) => isRecord(programme) && typeof programme.id === 'string' && typeof programme.title === 'string' && Array.isArray(programme.spaces) && programme.spaces.every((space) => typeof space === 'string'));
  }
  if (loaded[0].status === 'fulfilled' && isRecord(loaded[0].value.inputs)) {
    try { defaults = validatePack({ version: 1, inputs: loaded[0].value.inputs, programmes: DEFAULT_PROGRAMMES }); } catch { /* The built-in scenario still works if the data file cannot be read. */ }
  }
  scenario = { version: 1, inputs: copyInputs(defaults.inputs), programmes: [...defaults.programmes] };
  let status = '';
  const linked = new URL(window.location.href).searchParams.get('scenario');
  let loadedLink = false;
  if (linked !== null) {
    try {
      scenario = parsePack(linked);
      loadedLink = true;
      status = 'Scenario loaded from this link.';
    } catch (error) { status = `The linked scenario was not loaded. ${error.message}`; }
  }
  if (!loadedLink) {
    const stored = storageRead(SCENARIO_KEY);
    if (stored) {
      try { scenario = parsePack(stored); if (!status) status = 'Your saved device scenario is loaded.'; }
      catch { if (!status) status = 'Illustrative defaults loaded. The saved device scenario could not be read.'; }
    }
  }
  applyScenario();
  wireCalculators();
  wireProgrammes();
  if (loadedLink) persistScenario();
  if (!storageAvailable) status += `${status ? ' ' : ''}Device storage is unavailable; scenario files still work.`;
  if (status) setStatus(status);
}

initialise().catch(() => {
  setStatus('The planning controls could not start. The published explanation and default figures remain available.');
});
