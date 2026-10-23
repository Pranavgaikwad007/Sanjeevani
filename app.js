const initialOperations = [
  { id: 'ship-1', type: 'Cooked meals', icon: '🍱', iconClass: 'meals', donor: 'Banquet Hall South', source: 'Banquet Hall South', destination: 'Night Shelter A', quantity: 40, unit: 'meals', status: 'transit', statusLabel: 'In transit', minutes: 18, progress: 74, rider: 'Aarav Mehta', capacity: '40 / 40', mode: 'Scooter', critical: false, color: 'lime', action: 'View route' },
  { id: 'ship-2', type: 'Medical supplies', icon: '✚', iconClass: 'medical', donor: 'City Pharmacy', source: 'City Pharmacy', destination: 'Relief Camp 4', quantity: 12, unit: 'cold-chain kits', status: 'action', statusLabel: 'Needs rider', minutes: 42, progress: 0, rider: '3 nearby riders', capacity: '12 / 12', mode: 'Cold-chain', critical: true, color: 'orange', action: 'Find rider' },
  { id: 'ship-3', type: 'Cooked meals', icon: '🍱', iconClass: 'meals', donor: 'Hostel 12 Mess', source: 'Hostel 12 Mess', destination: 'Shelter B', quantity: 60, unit: 'meals', status: 'reserving', statusLabel: 'Reservation at risk', minutes: 7, progress: 28, rider: 'Meera Joshi', capacity: '40 / 60', mode: 'Scooter', critical: true, color: 'orange', action: 'Ping rider', reservation: true },
  { id: 'ship-4', type: 'Cooked meals', icon: '🍱', iconClass: 'meals', donor: 'Central Kitchen', source: 'Central Kitchen', destination: 'Community Kitchen', quantity: 80, unit: 'meals', status: 'transit', statusLabel: 'In transit', minutes: 33, progress: 61, rider: 'Kabir Singh', capacity: '40 / 80', mode: 'Cargo bike', critical: false, color: 'lime', action: 'View route' },
  { id: 'ship-5', type: 'Ration kits', icon: '▦', iconClass: 'ration', donor: 'Fresh Mart', source: 'Fresh Mart', destination: 'Night Shelter A', quantity: 24, unit: 'kits', status: 'ready', statusLabel: 'Ready to match', minutes: 118, progress: 0, rider: 'Open allocation', capacity: '0 / 24', mode: 'Any vehicle', critical: false, color: 'blue', action: 'Find match' },
  { id: 'ship-6', type: 'Cooked meals', icon: '🍱', iconClass: 'meals', donor: 'Community Pantry', source: 'Community Pantry', destination: 'Night Shelter A', quantity: 30, unit: 'meals', status: 'transit', statusLabel: 'In transit', minutes: 26, progress: 84, rider: 'Zoya Khan', capacity: '30 / 30', mode: 'Scooter', critical: false, color: 'lime', action: 'View route' },
  { id: 'ship-7', type: 'Medical supplies', icon: '✚', iconClass: 'medical', donor: 'Green Cross', source: 'Green Cross', destination: 'Relief Camp 2', quantity: 8, unit: 'kits', status: 'delivered', statusLabel: 'Delivered', minutes: 0, progress: 100, rider: 'Sanjay Rao', capacity: '8 / 8', mode: 'Cold-chain', critical: false, color: 'blue', action: 'View receipt' },
  { id: 'ship-8', type: 'Cooked meals', icon: '🍱', iconClass: 'meals', donor: 'Dosa House', source: 'Dosa House', destination: 'Night Shelter C', quantity: 50, unit: 'meals', status: 'action', statusLabel: 'Needs rider', minutes: 12, progress: 0, rider: '2 nearby riders', capacity: '0 / 50', mode: 'Scooter', critical: true, color: 'orange', action: 'Find rider' }
];

let operations = [...initialOperations];
let activities = [
  { icon: 'lime', title: '40 meals are moving to Night Shelter A', detail: 'Aarav checked in at Banquet Hall South', time: '2 min ago' },
  { icon: 'orange', title: 'Reservation needs a check-in', detail: 'Meera has 7 minutes before the claim releases', time: '4 min ago' },
  { icon: 'blue', title: 'Cold-chain match found', detail: 'City Pharmacy is visible to 3 eligible riders', time: '6 min ago' }
];
let activeFilter = 'all';
let activeView = 'operations';
let simulationMinutes = 0;
let streamPaused = false;
let toastTimer;
let shelterAClosed = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function formatClock() {
  const baseMinutes = 20 * 60 + 24 + simulationMinutes;
  const minute = baseMinutes % 60;
  const hour = Math.floor((baseMinutes / 60) % 24);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getStatusClass(status) {
  return ['transit', 'reserving', 'action', 'ready', 'rerouted', 'delivered'].includes(status) ? status : 'ready';
}

function filteredOperations() {
  if (activeFilter === 'critical') return operations.filter((operation) => operation.status !== 'delivered' && (operation.critical || operation.minutes <= 15));
  if (activeFilter === 'transit') return operations.filter((operation) => operation.status === 'transit' || operation.status === 'rerouted');
  if (activeFilter === 'action') return operations.filter((operation) => ['action', 'reserving'].includes(operation.status));
  return operations;
}

function renderOperations() {
  const list = $('#operation-list');
  const visible = filteredOperations();
  $('#all-count').textContent = operations.length;
  if (!visible.length) {
    list.innerHTML = '<div class="empty-state">Nothing in this view right now. The network is clear.</div>';
    return;
  }
  list.innerHTML = visible.map((operation) => {
    const statusClass = getStatusClass(operation.status);
    const destination = shelterAClosed && operation.destination === 'Night Shelter A' ? 'Night Shelter A · closed' : operation.destination;
    const actionLabel = operation.action || (operation.status === 'delivered' ? 'View receipt' : 'Open');
    return `<article class="operation-card" data-operation="${escapeHTML(operation.id)}">
      <div class="operation-card-head">
        <div class="aid-icon ${escapeHTML(operation.iconClass)}">${operation.icon}</div>
        <div class="operation-name"><strong>${escapeHTML(operation.quantity)} ${escapeHTML(operation.unit)} · ${escapeHTML(operation.donor)}</strong><span>${escapeHTML(operation.type)} · ${escapeHTML(operation.mode)}</span></div>
        <span class="status-pill ${statusClass}">${escapeHTML(operation.statusLabel)}</span>
      </div>
      <div class="operation-route"><div class="route-point"><i class="route-dot"></i><span>${escapeHTML(operation.source)}</span></div><span class="route-arrow">→</span><div class="route-point"><i class="route-dot"></i><span>${escapeHTML(destination)}</span></div></div>
      <div class="operation-progress ${escapeHTML(operation.color || 'lime')}"><span style="width:${Math.min(100, operation.progress)}%"></span></div>
      <div class="operation-meta"><span class="meta-item">◷ <strong>${operation.status === 'delivered' ? 'Complete' : `${Math.max(0, operation.minutes)} min left`}</strong></span><span class="meta-item">♙ <strong>${escapeHTML(operation.rider)}</strong></span><span class="meta-item">▣ <strong>${escapeHTML(operation.capacity)}</strong></span><span class="meta-spacer"></span><button class="operation-action" data-operation-action="${escapeHTML(operation.id)}">${escapeHTML(actionLabel)} <span>→</span></button></div>
    </article>`;
  }).join('');
}

function renderAttention() {
  const attention = operations.filter((operation) => operation.critical || operation.status === 'reserving').slice(0, 3);
  const list = $('#attention-list');
  if (!attention.length) {
    list.innerHTML = '<div class="empty-state">All clear for now.</div>';
    return;
  }
  list.innerHTML = attention.map((operation, index) => {
    const marker = operation.status === 'reserving' ? '◷' : '!';
    const copy = operation.status === 'reserving' ? `${operation.rider} has not checked in yet` : `${operation.quantity} ${operation.unit} still need a rider`;
    const action = operation.status === 'reserving' ? 'Ping' : 'Match';
    return `<div class="attention-item"><div class="attention-marker ${index === 1 ? 'yellow' : ''}">${marker}</div><div class="attention-copy"><strong>${escapeHTML(operation.donor)} · ${escapeHTML(operation.destination)}</strong><span>${escapeHTML(copy)} · ${Math.max(0, operation.minutes)} min remaining</span></div><button class="attention-action" data-attention-action="${escapeHTML(operation.id)}">${action}</button></div>`;
  }).join('');
}

function renderActivity() {
  const list = $('#activity-list');
  list.innerHTML = activities.slice(0, 3).map((activity) => `<div class="activity-item"><i class="activity-dot ${escapeHTML(activity.icon)}"></i><div class="activity-copy"><strong>${escapeHTML(activity.title)}</strong><span>${escapeHTML(activity.detail)}</span><small class="activity-time">${escapeHTML(activity.time)}</small></div></div>`).join('');
}

function updateMetrics() {
  const active = operations.filter((operation) => !['delivered', 'expired'].includes(operation.status)).length;
  const attention = operations.filter((operation) => operation.critical || operation.status === 'reserving').length;
  const servings = operations.filter((operation) => operation.status !== 'delivered').reduce((sum, operation) => sum + operation.quantity, 0);
  $('#active-shipments').textContent = String(active).padStart(2, '0');
  $('#attention-count').textContent = String(attention).padStart(2, '0');
  $('#critical-count').textContent = operations.filter((operation) => operation.status !== 'delivered' && (operation.critical || operation.minutes <= 15)).length;
  $('#transit-count').textContent = operations.filter((operation) => operation.status === 'transit' || operation.status === 'rerouted').length;
  $('#action-count').textContent = operations.filter((operation) => ['action', 'reserving'].includes(operation.status)).length;
  $('#shelter-demand').innerHTML = `${Math.max(41, 76 - Math.floor(simulationMinutes / 20))}<span class="metric-unit">%</span>`;
  if (servings > 0) $('#all-count').textContent = operations.length;
}

function renderAll() {
  $('#clock-time').textContent = formatClock();
  renderOperations();
  renderAttention();
  renderActivity();
  updateMetrics();
}

function addActivity(icon, title, detail, time = 'just now') {
  activities.unshift({ icon, title, detail, time });
  if (!streamPaused) renderActivity();
}

function showToast(message) {
  const toast = $('#toast');
  $('#toast-message').textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function openModal() {
  $('#batch-modal').classList.add('open');
  $('#batch-modal').setAttribute('aria-hidden', 'false');
  $('#batch-type').focus();
}

function closeModal() {
  $('#batch-modal').classList.remove('open');
  $('#batch-modal').setAttribute('aria-hidden', 'true');
}

function advanceTime(minutes = 10) {
  simulationMinutes += minutes;
  operations.forEach((operation) => {
    if (operation.status === 'delivered' || operation.status === 'expired') return;
    operation.minutes -= minutes;
    if (operation.status === 'reserving' && operation.minutes <= 0) {
      operation.status = 'action';
      operation.statusLabel = 'Reservation released';
      operation.rider = 'Open allocation';
      operation.action = 'Find rider';
      operation.critical = true;
      operation.reservation = false;
      operation.progress = 0;
      addActivity('orange', 'A reservation was released automatically', `${operation.quantity} ${operation.unit} returned to the open pool`);
    } else if ((operation.status === 'transit' || operation.status === 'rerouted') && operation.minutes <= 0) {
      operation.status = 'delivered';
      operation.statusLabel = 'Delivered';
      operation.progress = 100;
      addActivity('lime', `${operation.quantity} ${operation.unit} delivered safely`, `${operation.rider} completed the handoff to ${operation.destination}`);
    } else if (operation.status === 'transit' || operation.status === 'rerouted') {
      operation.progress = Math.min(96, operation.progress + 7);
    }
  });
  renderAll();
  showToast(`Simulation moved forward ${minutes} minutes`);
}

function runScenario(scenario) {
  if (scenario === 'no-show') {
    const reservation = operations.find((operation) => operation.status === 'reserving');
    if (!reservation) return showToast('No active reservation to release');
    reservation.status = 'action';
    reservation.statusLabel = 'Reservation released';
    reservation.rider = 'Open allocation';
    reservation.action = 'Find rider';
    reservation.reservation = false;
    reservation.critical = true;
    reservation.progress = 0;
    addActivity('orange', 'Ghost reservation detected and released', `${reservation.quantity} meals are visible to the network again`);
    renderAll();
    return showToast('Reservation released — the network is recovering');
  }
  if (scenario === 'closure') {
    shelterAClosed = true;
    const shipment = operations.find((operation) => operation.destination === 'Night Shelter A' && ['transit', 'rerouted'].includes(operation.status));
    if (shipment) {
      shipment.destination = 'Community Kitchen Hub';
      shipment.status = 'rerouted';
      shipment.statusLabel = 'Rerouted safely';
      shipment.action = 'View reroute';
      shipment.progress = Math.max(38, shipment.progress - 10);
      shipment.color = 'blue';
      addActivity('blue', 'Shelter A closed — shipment rerouted', `${shipment.quantity} ${shipment.unit} redirected to Community Kitchen Hub`);
    }
    renderAll();
    return showToast('Destination closed; an eligible fallback was found');
  }
  if (scenario === 'split') {
    const splitSource = 'Banquet Hall South';
    const parts = [40, 40, 40, 40, 20];
    parts.forEach((quantity, index) => operations.push({ id: `split-${Date.now()}-${index}`, type: 'Cooked meals', icon: '🍱', iconClass: 'meals', donor: splitSource, source: splitSource, destination: index < 3 ? 'Shelter A' : 'Night Shelter C', quantity, unit: 'meals', status: index < 2 ? 'reserving' : 'ready', statusLabel: index < 2 ? 'Reservation at risk' : 'Ready to match', minutes: 75, progress: index < 2 ? 12 : 0, rider: index < 2 ? `Rider ${index + 1} pending` : 'Open allocation', capacity: `0 / ${quantity}`, mode: 'Scooter', critical: index < 2, color: index < 2 ? 'orange' : 'lime', action: index < 2 ? 'Ping rider' : 'Find rider' }));
    addActivity('lime', '180-meal batch split into five safe loads', '5 riders can now move the supply without overloading a single scooter');
    renderAll();
    return showToast('Batch split into five rider-sized allocations');
  }
}

function handleOperationAction(id) {
  const operation = operations.find((item) => item.id === id);
  if (!operation) return;
  if (operation.status === 'action' || operation.status === 'ready') {
    operation.status = 'reserving';
    operation.statusLabel = 'Reservation at risk';
    operation.rider = operation.rider === 'Open allocation' ? 'Auto-matching nearby rider' : operation.rider;
    operation.action = 'Ping rider';
    operation.reservation = true;
    operation.critical = true;
    operation.progress = 18;
    addActivity('lime', `Match started for ${operation.quantity} ${operation.unit}`, `${operation.rider} has a temporary reservation`);
    renderAll();
    return showToast('A short-lived reservation has been created');
  }
  if (operation.status === 'reserving') {
    addActivity('orange', `Check-in requested from ${operation.rider}`, `${operation.donor} will stay open while the rider responds`);
    renderActivity();
    return showToast('Check-in ping sent to the rider');
  }
  if (operation.status === 'transit') {
    operation.status = 'rerouted';
    operation.statusLabel = 'Rerouted safely';
    operation.destination = 'Community Kitchen Hub';
    operation.action = 'View reroute';
    operation.color = 'blue';
    addActivity('blue', `${operation.quantity} ${operation.unit} rerouted`, `New destination: Community Kitchen Hub`);
    renderAll();
    return showToast('Eligible fallback destination selected');
  }
  showToast('Receipt is available in the shipment record');
}

function setView(view) {
  activeView = view;
  const labels = { operations: 'Operations', dispatch: 'Dispatch queue', shelters: 'Shelters', riders: 'Riders', impact: 'Impact' };
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
  $('#current-view-label').textContent = labels[view] || 'Operations';
  if (view !== 'operations') showToast(`${labels[view]} workspace selected`);
}

$('#add-batch').addEventListener('click', openModal);
$('#sidebar-add').addEventListener('click', openModal);
$('#close-modal').addEventListener('click', closeModal);
$('#cancel-modal').addEventListener('click', closeModal);
$('#batch-modal').addEventListener('click', (event) => { if (event.target === $('#batch-modal')) closeModal(); });
$('#advance-time').addEventListener('click', () => advanceTime(10));
$('#sidebar-scenario').addEventListener('click', () => { $('#scenario-card').scrollIntoView({ behavior: 'smooth', block: 'center' }); showToast('Scenario lab ready'); });
$('#filter-button').addEventListener('click', () => $('#filter-row').classList.toggle('expanded'));
$('#view-all').addEventListener('click', () => { activeFilter = 'all'; $$('.filter-chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.filter === 'all')); renderOperations(); showToast(`${operations.length} dispatches shown`); });
$('#clear-attention').addEventListener('click', () => { operations.forEach((operation) => { if (operation.status === 'reserving') operation.critical = false; }); renderAll(); showToast('Attention list cleared for this view'); });
$('#pause-stream').addEventListener('click', (event) => { streamPaused = !streamPaused; event.currentTarget.textContent = streamPaused ? 'Resume stream' : 'Pause stream'; showToast(streamPaused ? 'Activity stream paused' : 'Activity stream resumed'); });

$$('.filter-chip').forEach((chip) => chip.addEventListener('click', () => { activeFilter = chip.dataset.filter; $$('.filter-chip').forEach((item) => item.classList.toggle('active', item === chip)); renderOperations(); }));
$$('.nav-item').forEach((item) => item.addEventListener('click', () => setView(item.dataset.view)));
$$('.scenario-actions button').forEach((button) => button.addEventListener('click', () => runScenario(button.dataset.scenario)));

$('#operation-list').addEventListener('click', (event) => { const button = event.target.closest('[data-operation-action]'); if (button) handleOperationAction(button.dataset.operationAction); });
$('#attention-list').addEventListener('click', (event) => { const button = event.target.closest('[data-attention-action]'); if (button) handleOperationAction(button.dataset.attentionAction); });

$('#batch-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const type = $('#batch-type').value;
  const quantity = Number($('#batch-quantity').value);
  const minutes = Number($('#batch-expiry').value);
  const donor = $('#batch-donor').value.trim();
  const handling = $('#batch-handling').value;
  const isDependencySensitive = handling.includes('water') || handling.includes('fuel');
  const icons = { 'Cooked meals': ['🍱', 'meals', 'meals'], 'Medical supplies': ['✚', 'medical', 'cold-chain kits'], 'Ration kits': ['▦', 'ration', 'kits'], 'Infant formula': ['◒', 'medical', 'formula packs'] };
  const [icon, iconClass, unit] = icons[type] || ['▦', 'ration', 'units'];
  const operation = { id: `new-${Date.now()}`, type, icon, iconClass, donor, source: donor, destination: isDependencySensitive ? 'Compatibility check' : 'Best-fit shelter', quantity, unit, status: isDependencySensitive ? 'action' : 'ready', statusLabel: isDependencySensitive ? 'Dependency check' : 'Ready to match', minutes, progress: 0, rider: isDependencySensitive ? handling.replace('Needs ', '') : 'Open allocation', capacity: `0 / ${quantity}`, mode: handling.includes('cold-chain') ? 'Cold-chain' : 'Any vehicle', critical: isDependencySensitive || minutes <= 20, color: isDependencySensitive ? 'orange' : 'lime', action: isDependencySensitive ? 'Review rule' : 'Find match' };
  operations.unshift(operation);
  addActivity(isDependencySensitive ? 'orange' : 'lime', `${quantity} ${unit} logged from ${donor}`, isDependencySensitive ? `${handling} · destination validation required` : 'Now visible to eligible riders and shelters');
  closeModal();
  event.target.reset();
  renderAll();
  showToast(isDependencySensitive ? 'Donation logged with a compatibility check' : 'Donation added to the dispatch queue');
});

document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
renderAll();
