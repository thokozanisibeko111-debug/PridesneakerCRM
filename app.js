const state = {
  customers: JSON.parse(localStorage.getItem("customers") || "[]"),
  services: JSON.parse(localStorage.getItem("services") || "[]"),
  jobs: JSON.parse(localStorage.getItem("jobs") || "[]"),
};

const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".tab-panel");
const customerForm = document.getElementById("customer-form");
const customerList = document.getElementById("customer-list");
const serviceForm = document.getElementById("service-form");
const serviceList = document.getElementById("service-list");
const jobForm = document.getElementById("job-form");
const jobCustomer = document.getElementById("job-customer");
const sneakerContainer = document.getElementById("sneaker-container");
const addSneakerButton = document.getElementById("add-sneaker");
const jobList = document.getElementById("job-list");
const sneakerTemplate = document.getElementById("sneaker-template");

function save() {
  localStorage.setItem("customers", JSON.stringify(state.customers));
  localStorage.setItem("services", JSON.stringify(state.services));
  localStorage.setItem("jobs", JSON.stringify(state.jobs));
}

function uid() {
  return crypto.randomUUID();
}

function switchTab(tabId) {
  tabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabId));
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
}

tabs.forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

customerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("customer-name").value.trim();
  const phone = document.getElementById("customer-phone").value.trim();
  if (!name || !phone) return;

  state.customers.push({ id: uid(), name, phone });
  customerForm.reset();
  save();
  renderAll();
});

serviceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("service-name").value.trim();
  const price = Number.parseFloat(document.getElementById("service-price").value);
  if (!name || Number.isNaN(price)) return;

  state.services.push({ id: uid(), name, price });
  serviceForm.reset();
  save();
  renderAll();
});

function makeDeleteButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = "danger";
  button.addEventListener("click", onClick);
  return button;
}

function deleteCustomer(customerId) {
  state.customers = state.customers.filter((customer) => customer.id !== customerId);
  state.jobs = state.jobs.filter((job) => job.customerId !== customerId);
  save();
  renderAll();
}

function renderCustomers() {
  customerList.innerHTML = "";
  state.customers.forEach((customer) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML = `<span><strong>${customer.name}</strong> • ${customer.phone}</span>`;
    li.appendChild(makeDeleteButton("Delete Customer", () => deleteCustomer(customer.id)));
    customerList.appendChild(li);
  });

  jobCustomer.innerHTML = "";
  state.customers.forEach((customer) => {
    const option = document.createElement("option");
    option.value = customer.id;
    option.textContent = `${customer.name} (${customer.phone})`;
    jobCustomer.appendChild(option);
  });
}

function renderServices() {
  serviceList.innerHTML = "";
  state.services.forEach((service) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.textContent = `${service.name} — $${service.price.toFixed(2)}`;
    serviceList.appendChild(li);
  });

  sneakerContainer.querySelectorAll(".sneaker-service").forEach((select) => fillServiceOptions(select));
}

function fillServiceOptions(select) {
  const currentValue = select.value;
  select.innerHTML = "";
  state.services.forEach((service) => {
    const option = document.createElement("option");
    option.value = service.id;
    option.textContent = `${service.name} ($${service.price.toFixed(2)})`;
    select.appendChild(option);
  });
  if (currentValue) {
    select.value = currentValue;
  }
}

function addSneakerForm() {
  const fragment = sneakerTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".sneaker-item");
  const serviceSelect = fragment.querySelector(".sneaker-service");
  const removeButton = fragment.querySelector(".remove-sneaker");
  const imageInput = fragment.querySelector(".sneaker-images");
  const preview = fragment.querySelector(".preview-grid");

  fillServiceOptions(serviceSelect);

  removeButton.addEventListener("click", () => {
    item.remove();
  });

  imageInput.addEventListener("change", () => {
    const files = [...imageInput.files];
    if (files.length > 4) {
      alert("You can upload up to 4 images per sneaker.");
      imageInput.value = "";
      preview.innerHTML = "";
      return;
    }

    preview.innerHTML = "";
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
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

addSneakerButton.addEventListener("click", addSneakerForm);

jobForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!state.customers.length || !state.services.length) {
    alert("Add at least one customer and one service first.");
    return;
  }

  const sneakerCards = [...sneakerContainer.querySelectorAll(".sneaker-item")];
  if (!sneakerCards.length) {
    alert("Add at least one sneaker to this job.");
    return;
  }

  const sneakers = [];

  for (const card of sneakerCards) {
    const name = card.querySelector(".sneaker-name").value.trim();
    const serviceId = card.querySelector(".sneaker-service").value;
    const files = [...card.querySelector(".sneaker-images").files];

    if (!name || !serviceId) {
      alert("Each sneaker needs a name and service.");
      return;
    }

    if (files.length > 4) {
      alert("Each sneaker can only have 4 images max.");
      return;
    }

    const imageData = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          })
      )
    );

    sneakers.push({
      id: uid(),
      name,
      serviceId,
      images: imageData,
    });
  }

  const job = {
    id: uid(),
    customerId: jobCustomer.value,
    sneakers,
    createdAt: new Date().toISOString(),
  };

  state.jobs.unshift(job);
  save();

  sneakerContainer.innerHTML = "";
  addSneakerForm();
  renderJobs();
});

function renderJobs() {
  jobList.innerHTML = "";
  state.jobs.forEach((job) => {
    const customer = state.customers.find((item) => item.id === job.customerId);
    if (!customer) return;

    const li = document.createElement("li");
    li.className = "list-item";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<strong>${customer.name}</strong> • ${new Date(job.createdAt).toLocaleString()}`;

    job.sneakers.forEach((sneaker) => {
      const service = state.services.find((item) => item.id === sneaker.serviceId);
      const row = document.createElement("div");
      row.className = "job-sneaker";
      row.textContent = `${sneaker.name} — ${service ? service.name : "Unknown Service"} — ${sneaker.images.length} image(s)`;
      wrapper.appendChild(row);
    });

    li.appendChild(wrapper);
    jobList.appendChild(li);
  });
}

function renderAll() {
  renderCustomers();
  renderServices();
  renderJobs();
}

if (!state.services.length) {
  state.services.push(
    { id: uid(), name: "Basic Wash", price: 20 },
    { id: uid(), name: "Deep Clean", price: 35 }
  );
}

if (!sneakerContainer.children.length) {
  addSneakerForm();
}

renderAll();
save();
