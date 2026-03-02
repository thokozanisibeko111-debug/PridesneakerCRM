// ────────────────────────────────────────────────
// State — persisted to localStorage
// ────────────────────────────────────────────────
const state = {
  customers: JSON.parse(localStorage.getItem("customers") || "[]"),
  services:  JSON.parse(localStorage.getItem("services")  || "[]"),
  jobs:      JSON.parse(localStorage.getItem("jobs")      || "[]"),
};

// ────────────────────────────────────────────────
// DOM refs
// ────────────────────────────────────────────────
const tabs             = document.querySelectorAll(".tab-btn");
const panels           = document.querySelectorAll(".tab-panel");
const customerForm     = document.getElementById("customer-form");
const customerList     = document.getElementById("customer-list");
const customerSearch   = document.getElementById("customer-search");
const serviceForm      = document.getElementById("service-form");
const serviceList      = document.getElementById("service-list");
const jobForm          = document.getElementById("job-form");
const jobCustomer      = document.getElementById("job-customer");
const sneakerContainer = document.getElementById("sneaker-container");
const addSneakerBtn    = document.getElementById("add-sneaker");
const jobList          = document.getElementById("job-list");
const sneakerTemplate  = document.getElementById("sneaker-template");
const jobStatusFilter  = document.getElementById("job-status-filter");
const statCustomers    = document.getElementById("stat-customers");
const statJobs         = document.getElementById("stat-jobs");
const statActive       = document.getElementById("stat-active");
const toastContainer   = document.getElementById("toast-container");

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function uid() {
  return crypto.randomUUID();
}

function formatPrice(amount) {
  return `R ${Number(amount).toFixed(2)}`;
}

function save() {
  localStorage.setItem("customers", JSON.stringify(state.customers));
  localStorage.setItem("services",  JSON.stringify(state.services));
  localStorage.setItem("jobs",      JSON.stringify(state.jobs));
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  // Trigger transition on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("toast-visible"));
  });
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function makeDeleteButton(label, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.className = "danger";
  btn.addEventListener("click", onClick);
  return btn;
}

// ────────────────────────────────────────────────
// Tab navigation
// ────────────────────────────────────────────────
function switchTab(tabId) {
  tabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabId));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
}

tabs.forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

// ────────────────────────────────────────────────
// Customers
// ────────────────────────────────────────────────
customerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name  = document.getElementById("customer-name").value.trim();
  const phone = document.getElementById("customer-phone").value.trim();
  if (!name || !phone) return;
  state.customers.push({ id: uid(), name, phone });
  customerForm.reset();
  save();
  renderAll();
  showToast(`Customer "${name}" added.`);
});

customerSearch.addEventListener("input", renderCustomers);

function deleteCustomer(customerId) {
  const customer = state.customers.find((c) => c.id === customerId);
  if (!customer) return;
  const jobCount = state.jobs.filter((j) => j.customerId === customerId).length;
  const msg = jobCount
    ? `Delete ${customer.name}? This will also delete their ${jobCount} job(s).`
    : `Delete ${customer.name}?`;
  if (!window.confirm(msg)) return;
  state.customers = state.customers.filter((c) => c.id !== customerId);
  state.jobs      = state.jobs.filter((j) => j.customerId !== customerId);
  save();
  renderAll();
  showToast(`Customer "${customer.name}" removed.`, "error");
}

function renderCustomers() {
  const query    = (customerSearch.value || "").trim().toLowerCase();
  const filtered = query
    ? state.customers.filter(
        (c) => c.name.toLowerCase().includes(query) || c.phone.includes(query)
      )
    : state.customers;

  customerList.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = query
      ? "No customers match your search."
      : "No customers yet. Add one above.";
    customerList.appendChild(empty);
  } else {
    filtered.forEach((customer) => {
      const jobCount = state.jobs.filter((j) => j.customerId === customer.id).length;

      const li = document.createElement("li");
      li.className = "list-item";

      // Info span — built via DOM to avoid XSS
      const info   = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = customer.name;
      info.appendChild(strong);
      info.append(` \u2022 ${customer.phone}`);

      if (jobCount) {
        const badge = document.createElement("span");
        badge.className = "job-count-badge";
        badge.textContent = `${jobCount} job${jobCount !== 1 ? "s" : ""}`;
        info.append("\u00a0");
        info.appendChild(badge);
      }

      li.appendChild(info);
      li.appendChild(makeDeleteButton("Delete", () => deleteCustomer(customer.id)));
      customerList.appendChild(li);
    });
  }

  // Populate job customer select
  jobCustomer.innerHTML = "";
  if (!state.customers.length) {
    const opt = document.createElement("option");
    opt.textContent = "— add a customer first —";
    opt.disabled = true;
    jobCustomer.appendChild(opt);
  } else {
    state.customers.forEach((customer) => {
      const opt = document.createElement("option");
      opt.value = customer.id;
      opt.textContent = `${customer.name} (${customer.phone})`;
      jobCustomer.appendChild(opt);
    });
  }
}

// ────────────────────────────────────────────────
// Services
// ────────────────────────────────────────────────
serviceForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name  = document.getElementById("service-name").value.trim();
  const price = parseFloat(document.getElementById("service-price").value);
  if (!name || isNaN(price) || price < 0) return;
  state.services.push({ id: uid(), name, price });
  serviceForm.reset();
  save();
  renderAll();
  showToast(`Service "${name}" added.`);
});

function deleteService(serviceId) {
  const service = state.services.find((s) => s.id === serviceId);
  if (!service) return;
  const inUse = state.jobs.some((j) => j.sneakers.some((sn) => sn.serviceId === serviceId));
  if (inUse) {
    showToast("Cannot delete a service that is used in existing jobs.", "error");
    return;
  }
  if (!window.confirm(`Delete service "${service.name}"?`)) return;
  state.services = state.services.filter((s) => s.id !== serviceId);
  save();
  renderAll();
  showToast(`Service "${service.name}" removed.`, "error");
}

function fillServiceOptions(select) {
  const currentValue = select.value;
  select.innerHTML = "";
  state.services.forEach((service) => {
    const opt = document.createElement("option");
    opt.value = service.id;
    opt.textContent = `${service.name} (${formatPrice(service.price)})`;
    select.appendChild(opt);
  });
  if (currentValue) select.value = currentValue;
}

function renderServices() {
  serviceList.innerHTML = "";
  if (!state.services.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No services yet. Add one above.";
    serviceList.appendChild(empty);
  } else {
    state.services.forEach((service) => {
      const li = document.createElement("li");
      li.className = "list-item";

      const info   = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = service.name;
      info.appendChild(strong);
      info.append(` \u2014 ${formatPrice(service.price)}`);

      li.appendChild(info);
      li.appendChild(makeDeleteButton("Delete", () => deleteService(service.id)));
      serviceList.appendChild(li);
    });
  }

  // Refresh service dropdowns inside the sneaker form
  sneakerContainer.querySelectorAll(".sneaker-service").forEach(fillServiceOptions);
}

// ────────────────────────────────────────────────
// Sneaker form
// ────────────────────────────────────────────────
function addSneakerForm() {
  const fragment      = sneakerTemplate.content.cloneNode(true);
  const item          = fragment.querySelector(".sneaker-item");
  const serviceSelect = fragment.querySelector(".sneaker-service");
  const removeBtn     = fragment.querySelector(".remove-sneaker");
  const imageInput    = fragment.querySelector(".sneaker-images");
  const preview       = fragment.querySelector(".preview-grid");

  fillServiceOptions(serviceSelect);

  removeBtn.addEventListener("click", () => item.remove());

  imageInput.addEventListener("change", () => {
    const files = [...imageInput.files];
    if (files.length > 4) {
      showToast("Maximum 4 images per sneaker.", "error");
      imageInput.value = "";
      preview.innerHTML = "";
      return;
    }
    preview.innerHTML = "";
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onerror = () => showToast("Could not read image file.", "error");
      reader.onload  = () => {
        const img = document.createElement("img");
        img.src = reader.result;
        img.alt = file.name;
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  sneakerContainer.appendChild(fragment);
}

addSneakerBtn.addEventListener("click", addSneakerForm);

// ────────────────────────────────────────────────
// Jobs
// ────────────────────────────────────────────────
const JOB_STATUSES = {
  "pending":     { label: "Pending",     color: "status-pending"     },
  "in-progress": { label: "In Progress", color: "status-in-progress" },
  "done":        { label: "Done",        color: "status-done"        },
  "collected":   { label: "Collected",   color: "status-collected"   },
};

jobForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!state.customers.length) {
    showToast("Add at least one customer first.", "error");
    return;
  }
  if (!state.services.length) {
    showToast("Add at least one service first.", "error");
    return;
  }

  const sneakerCards = [...sneakerContainer.querySelectorAll(".sneaker-item")];
  if (!sneakerCards.length) {
    showToast("Add at least one sneaker to this job.", "error");
    return;
  }

  const sneakers = [];
  for (const card of sneakerCards) {
    const name      = card.querySelector(".sneaker-name").value.trim();
    const serviceId = card.querySelector(".sneaker-service").value;
    const files     = [...card.querySelector(".sneaker-images").files];

    if (!name || !serviceId) {
      showToast("Each sneaker needs a name and a service.", "error");
      return;
    }
    if (files.length > 4) {
      showToast("Each sneaker can have at most 4 images.", "error");
      return;
    }

    const imageData = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Image read failed"));
            reader.readAsDataURL(file);
          })
      )
    );

    sneakers.push({ id: uid(), name, serviceId, images: imageData });
  }

  const job = {
    id:         uid(),
    customerId: jobCustomer.value,
    sneakers,
    status:     "pending",
    createdAt:  new Date().toISOString(),
  };

  state.jobs.unshift(job);
  save();

  sneakerContainer.innerHTML = "";
  addSneakerForm();

  const customer = state.customers.find((c) => c.id === job.customerId);
  showToast(`Job created for ${customer ? customer.name : "customer"}.`);
  renderAll();
});

function updateJobStatus(jobId, newStatus) {
  const job = state.jobs.find((j) => j.id === jobId);
  if (!job) return;
  job.status = newStatus;
  save();
  renderJobs();
  renderStats();
  showToast(`Job marked as "${JOB_STATUSES[newStatus]?.label || newStatus}".`);
}

function deleteJob(jobId) {
  const job      = state.jobs.find((j) => j.id === jobId);
  const customer = state.customers.find((c) => c.id === job?.customerId);
  if (!window.confirm(`Delete this job for ${customer ? customer.name : "customer"}?`)) return;
  state.jobs = state.jobs.filter((j) => j.id !== jobId);
  save();
  renderAll();
  showToast("Job deleted.", "error");
}

function jobTotal(job) {
  return job.sneakers.reduce((sum, sn) => {
    const service = state.services.find((s) => s.id === sn.serviceId);
    return sum + (service ? service.price : 0);
  }, 0);
}

jobStatusFilter.addEventListener("change", renderJobs);

function renderJobs() {
  const filterStatus = jobStatusFilter.value;
  const filtered     = filterStatus
    ? state.jobs.filter((j) => (j.status || "pending") === filterStatus)
    : state.jobs;

  jobList.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = filterStatus
      ? "No jobs with that status."
      : "No wash jobs yet. Create one above.";
    jobList.appendChild(empty);
    return;
  }

  filtered.forEach((job) => {
    const customer   = state.customers.find((c) => c.id === job.customerId);
    if (!customer) return;

    const jobStatus  = job.status || "pending";
    const statusInfo = JOB_STATUSES[jobStatus];
    const total      = jobTotal(job);

    const li = document.createElement("li");
    li.className = "list-item list-item-col";

    // ── Header row
    const header     = document.createElement("div");
    header.className = "job-header";

    const titleSpan  = document.createElement("span");
    const strong     = document.createElement("strong");
    strong.textContent = customer.name;
    titleSpan.appendChild(strong);
    titleSpan.append(` \u2022 ${new Date(job.createdAt).toLocaleString("en-ZA")}`);

    const statusBadge     = document.createElement("span");
    statusBadge.className = `status-badge ${statusInfo.color}`;
    statusBadge.textContent = statusInfo.label;

    header.appendChild(titleSpan);
    header.appendChild(statusBadge);

    // ── Sneaker rows
    const sneakerList     = document.createElement("div");
    sneakerList.className = "job-sneakers";

    job.sneakers.forEach((sneaker) => {
      const service = state.services.find((s) => s.id === sneaker.serviceId);
      const row     = document.createElement("div");
      row.className = "job-sneaker";
      row.textContent = `${sneaker.name} \u2014 ${service ? service.name : "Unknown service"} (${formatPrice(service ? service.price : 0)})`;
      if (sneaker.images.length) {
        const photoNote = document.createElement("span");
        photoNote.className = "photo-note";
        photoNote.textContent = ` \u00b7 ${sneaker.images.length} photo${sneaker.images.length !== 1 ? "s" : ""}`;
        row.appendChild(photoNote);
      }
      sneakerList.appendChild(row);
    });

    // ── Total
    const totalRow     = document.createElement("div");
    totalRow.className = "job-total";
    totalRow.textContent = `Total: ${formatPrice(total)}`;

    // ── Controls
    const controls     = document.createElement("div");
    controls.className = "job-controls";

    const statusSelect     = document.createElement("select");
    statusSelect.className = "status-select";
    Object.entries(JOB_STATUSES).forEach(([value, { label }]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      if (value === jobStatus) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener("change", () => updateJobStatus(job.id, statusSelect.value));

    controls.appendChild(statusSelect);
    controls.appendChild(makeDeleteButton("Delete Job", () => deleteJob(job.id)));

    li.appendChild(header);
    li.appendChild(sneakerList);
    li.appendChild(totalRow);
    li.appendChild(controls);

    jobList.appendChild(li);
  });
}

// ────────────────────────────────────────────────
// Stats header
// ────────────────────────────────────────────────
function renderStats() {
  const active = state.jobs.filter(
    (j) => j.status === "pending" || j.status === "in-progress"
  ).length;
  statCustomers.textContent = `${state.customers.length} Customer${state.customers.length !== 1 ? "s" : ""}`;
  statJobs.textContent      = `${state.jobs.length} Job${state.jobs.length !== 1 ? "s" : ""}`;
  statActive.textContent    = `${active} Active`;
}

// ────────────────────────────────────────────────
// Render all
// ────────────────────────────────────────────────
function renderAll() {
  renderCustomers();
  renderServices();
  renderJobs();
  renderStats();
}

// ────────────────────────────────────────────────
// Seed defaults
// ────────────────────────────────────────────────
if (!state.services.length) {
  state.services.push(
    { id: uid(), name: "Basic Wash",       price: 150 },
    { id: uid(), name: "Deep Clean",       price: 250 },
    { id: uid(), name: "Sole Restoration", price: 350 },
  );
}

// Migrate any old jobs that were saved without a status field
state.jobs.forEach((job) => {
  if (!job.status) job.status = "pending";
});

if (!sneakerContainer.children.length) {
  addSneakerForm();
}

renderAll();
save();
