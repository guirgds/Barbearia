const STORAGE_KEY = "barbearia-app-state";
const PROMOTION_SEEN_KEY = "barbearia-seen-promotions";
const SERVICE_PRICES = {
  Corte: 45,
  Barba: 35,
  Sobrancelha: 20,
  Pigmentação: 60
};

const defaultState = {
  barbers: ["João", "Carlos"],
  appointments: [],
  promotions: []
};

const state = loadState();

const appointmentForm = document.getElementById("appointment-form");
const barberSelect = document.getElementById("barber");
const promotionSelect = document.getElementById("promotion-select");
const peopleList = document.getElementById("people-list");
const addPersonButton = document.getElementById("add-person");
const appointmentsView = document.getElementById("appointments");
const subtotalValue = document.getElementById("subtotal-value");
const discountValue = document.getElementById("discount-value");
const totalValue = document.getElementById("total-value");
const dateInput = document.getElementById("date");
const promotionExpiresAtInput = document.getElementById("promotion-expires-at");

const barberForm = document.getElementById("barber-form");
const newBarberInput = document.getElementById("new-barber");
const barbersAdmin = document.getElementById("barbers-admin");

const promotionForm = document.getElementById("promotion-form");
const promotionsAdmin = document.getElementById("promotions-admin");
const promotionsUser = document.getElementById("promotions-user");
const markPromotionsReadButton = document.getElementById("mark-promotions-read");
const enableBrowserNotificationsButton = document.getElementById("enable-browser-notifications");
const promotionBadge = document.getElementById("promotion-badge");

const toast = document.getElementById("toast");
const personTemplate = document.getElementById("person-template");

let previousPromotionIds = new Set(state.promotions.map((promotion) => promotion.id));

init();

function init() {
  configureCalendar();
  renderBarbers();
  renderPromotions();
  renderAppointments();
  addPerson();
  refreshPricePreview();
  checkAndNotifyPromotions();
}

function configureCalendar() {
  const today = new Date().toISOString().split("T")[0];
  dateInput.min = today;
  promotionExpiresAtInput.min = today;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      promotions: Array.isArray(parsed.promotions) ? parsed.promotions : []
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSeenPromotions() {
  const raw = localStorage.getItem(PROMOTION_SEEN_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setSeenPromotions(ids) {
  localStorage.setItem(PROMOTION_SEEN_KEY, JSON.stringify(ids));
}

function renderBarbers() {
  barberSelect.innerHTML = "";
  barbersAdmin.innerHTML = "";

  state.barbers.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    barberSelect.appendChild(option);

    const li = document.createElement("li");
    li.className = "row between";
    li.innerHTML = `<span>${name}</span>`;

    const removeButton = document.createElement("button");
    removeButton.textContent = "Excluir";
    removeButton.type = "button";
    removeButton.className = "danger mini";
    removeButton.addEventListener("click", () => {
      state.barbers.splice(index, 1);
      if (state.barbers.length === 0) state.barbers.push("Barbeiro padrão");
      persist();
      renderBarbers();
    });

    li.appendChild(removeButton);
    barbersAdmin.appendChild(li);
  });
}

function renderPromotionSelect() {
  promotionSelect.innerHTML = '<option value="">Sem promoção</option>';
  getActivePromotions().forEach((promotion) => {
    const option = document.createElement("option");
    option.value = promotion.id;
    option.textContent = `${promotion.title} (${promotion.discount}% OFF)`;
    promotionSelect.appendChild(option);
  });
}

function addPerson() {
  const fragment = personTemplate.content.cloneNode(true);
  const personItem = fragment.querySelector(".person-item");
  const removeButton = fragment.querySelector(".remove-person");

  removeButton.addEventListener("click", () => {
    personItem.remove();
    refreshPricePreview();
  });

  fragment.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", refreshPricePreview);
    input.addEventListener("change", refreshPricePreview);
  });

  peopleList.appendChild(fragment);
}

function collectPeople() {
  return [...peopleList.querySelectorAll(".person-item")]
    .map((item) => {
      const name = item.querySelector(".person-name").value.trim();
      const services = [...item.querySelectorAll("input[type='checkbox']")]
        .filter((input) => input.checked)
        .map((input) => input.value);

      if (!name || services.length === 0) return null;
      return { name, services };
    })
    .filter(Boolean);
}

function getActivePromotions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...state.promotions].filter((promotion) => {
    const expires = new Date(promotion.expiresAt);
    expires.setHours(23, 59, 59, 999);
    return expires >= today;
  });
}

function calculateSubtotal(people) {
  return people.reduce((sum, person) => {
    const servicesTotal = person.services.reduce((s, service) => s + (SERVICE_PRICES[service] || 0), 0);
    return sum + servicesTotal;
  }, 0);
}

function calculatePriceSummary(people, promotionId) {
  const subtotal = calculateSubtotal(people);
  const promotion = getActivePromotions().find((item) => item.id === promotionId);
  const discountRate = promotion ? promotion.discount / 100 : 0;
  const discount = subtotal * discountRate;
  const total = subtotal - discount;

  return {
    subtotal,
    discount,
    total,
    promotion
  };
}

function refreshPricePreview() {
  const people = collectPeople();
  const summary = calculatePriceSummary(people, promotionSelect.value);
  subtotalValue.textContent = formatCurrency(summary.subtotal);
  discountValue.textContent = `- ${formatCurrency(summary.discount)}`;
  totalValue.textContent = formatCurrency(summary.total);
}

function renderAppointments() {
  appointmentsView.innerHTML = "";

  if (state.appointments.length === 0) {
    appointmentsView.innerHTML = "<p>Nenhum agendamento ainda.</p>";
    return;
  }

  state.appointments
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .forEach((appointment, index) => {
      const card = document.createElement("article");
      card.className = "appointment";

      const details = appointment.people
        .map((person) => `<li><strong>${person.name}</strong>: ${person.services.join(", ")}</li>`)
        .join("");

      card.innerHTML = `
        <div class="row between">
          <h3>${formatDate(appointment.date)} às ${appointment.time}</h3>
          <button class="danger mini" type="button">Cancelar</button>
        </div>
        <p><strong>Barbeiro:</strong> ${appointment.barber}</p>
        <p><strong>Promoção:</strong> ${appointment.promotionTitle || "Sem promoção"}</p>
        <p><strong>Total:</strong> ${formatCurrency(appointment.total)}</p>
        <ul>${details}</ul>
      `;

      card.querySelector("button").addEventListener("click", () => {
        state.appointments.splice(index, 1);
        persist();
        renderAppointments();
      });

      appointmentsView.appendChild(card);
    });
}

function renderPromotions() {
  promotionsAdmin.innerHTML = "";
  promotionsUser.innerHTML = "";

  const sortedPromotions = [...state.promotions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sortedPromotions.length === 0) {
    promotionsAdmin.innerHTML = "<li>Nenhuma promoção cadastrada.</li>";
    promotionsUser.innerHTML = "<p>Sem promoções no momento.</p>";
    renderPromotionSelect();
    updatePromotionBadge();
    return;
  }

  sortedPromotions.forEach((promotion) => {
    const adminItem = document.createElement("li");
    adminItem.className = "promotion-item";
    adminItem.innerHTML = `
      <div>
        <strong>${promotion.title}</strong>
        <p>${promotion.description}</p>
        <small>${promotion.discount}% OFF • válida até ${formatDate(promotion.expiresAt)}</small>
      </div>
    `;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Excluir";
    removeButton.className = "danger mini";
    removeButton.addEventListener("click", () => {
      state.promotions = state.promotions.filter((currentPromotion) => currentPromotion.id !== promotion.id);
      persist();
      renderPromotions();
      refreshPricePreview();
      showToast("Promoção excluída.");
    });

    adminItem.appendChild(removeButton);
    promotionsAdmin.appendChild(adminItem);

    const corteComDesconto = SERVICE_PRICES.Corte * (1 - promotion.discount / 100);
    const barbaComDesconto = SERVICE_PRICES.Barba * (1 - promotion.discount / 100);
    const userItem = document.createElement("article");
    userItem.className = "promotion-card";
    userItem.innerHTML = `
      <h3>${promotion.title}</h3>
      <p>${promotion.description}</p>
      <p><strong>${promotion.discount}% OFF</strong></p>
      <small>Exemplo: Corte de ${formatCurrency(SERVICE_PRICES.Corte)} por ${formatCurrency(corteComDesconto)}</small><br />
      <small>Exemplo: Barba de ${formatCurrency(SERVICE_PRICES.Barba)} por ${formatCurrency(barbaComDesconto)}</small><br />
      <small>Válida até ${formatDate(promotion.expiresAt)}</small>
    `;

    promotionsUser.appendChild(userItem);
  });

  renderPromotionSelect();
  updatePromotionBadge();
}

function updatePromotionBadge() {
  const seenIds = new Set(getSeenPromotions());
  const unseenCount = state.promotions.filter((promotion) => !seenIds.has(promotion.id)).length;

  if (unseenCount > 0) {
    promotionBadge.classList.remove("hidden");
    promotionBadge.textContent = `${unseenCount} nova${unseenCount > 1 ? "s" : ""}`;
  } else {
    promotionBadge.classList.add("hidden");
  }
}

function markAllPromotionsAsRead() {
  setSeenPromotions(state.promotions.map((promotion) => promotion.id));
  updatePromotionBadge();
  showToast("Promoções marcadas como lidas.");
}

function getUnseenPromotions() {
  const seenIds = new Set(getSeenPromotions());
  return state.promotions.filter((promotion) => !seenIds.has(promotion.id));
}

function checkAndNotifyPromotions() {
  const currentIds = new Set(state.promotions.map((promotion) => promotion.id));
  const hasNewPromotion = [...currentIds].some((id) => !previousPromotionIds.has(id));

  if (!hasNewPromotion) {
    previousPromotionIds = currentIds;
    return;
  }

  const unseenPromotions = getUnseenPromotions();
  if (unseenPromotions.length === 0) return;

  const latest = unseenPromotions[0];
  showToast(`Nova promoção: ${latest.title} (${latest.discount}% OFF)`);
  triggerBrowserNotification(latest);
  previousPromotionIds = currentIds;
}

function triggerBrowserNotification(promotion) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("Nova promoção na barbearia", {
    body: `${promotion.title} • ${promotion.discount}% OFF até ${formatDate(promotion.expiresAt)}`
  });
}

function requestBrowserNotifications() {
  if (!("Notification" in window)) {
    alert("Seu navegador não suporta notificações.");
    return;
  }

  Notification.requestPermission().then((permission) => {
    showToast(
      permission === "granted"
        ? "Notificações do navegador ativadas."
        : "Permissão de notificação não concedida."
    );
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toast.classList.add("hidden"), 3000);
}

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return `promotion-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function formatDate(dateText) {
  const [year, month, day] = dateText.split("-");
  if (!year || !month || !day) return dateText;
  return `${day}/${month}/${year}`;
}

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

addPersonButton.addEventListener("click", addPerson);
promotionSelect.addEventListener("change", refreshPricePreview);
enableBrowserNotificationsButton.addEventListener("click", requestBrowserNotifications);
markPromotionsReadButton.addEventListener("click", markAllPromotionsAsRead);

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  const freshState = loadState();
  state.barbers = freshState.barbers;
  state.appointments = freshState.appointments;
  state.promotions = freshState.promotions;

  configureCalendar();
  renderBarbers();
  renderPromotions();
  renderAppointments();
  refreshPricePreview();
  checkAndNotifyPromotions();
});

barberForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = newBarberInput.value.trim();
  if (!name) return;
  if (state.barbers.includes(name)) {
    alert("Este barbeiro já existe.");
    return;
  }

  state.barbers.push(name);
  newBarberInput.value = "";
  persist();
  renderBarbers();
});

promotionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = document.getElementById("promotion-title").value.trim();
  const description = document.getElementById("promotion-description").value.trim();
  const discount = Number(document.getElementById("promotion-discount").value);
  const expiresAt = document.getElementById("promotion-expires-at").value;

  if (!title || !description || !discount || !expiresAt) {
    alert("Preencha todos os campos da promoção.");
    return;
  }

  state.promotions.push({
    id: generateId(),
    title,
    description,
    discount,
    expiresAt,
    createdAt: new Date().toISOString()
  });

  persist();
  promotionForm.reset();
  renderPromotions();
  refreshPricePreview();
  checkAndNotifyPromotions();
});

appointmentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const barber = barberSelect.value;
  const people = collectPeople();
  const summary = calculatePriceSummary(people, promotionSelect.value);

  if (!date || !time || !barber) {
    alert("Preencha data, horário e barbeiro.");
    return;
  }

  if (people.length === 0) {
    alert("Adicione ao menos uma pessoa com serviços.");
    return;
  }

  state.appointments.push({
    date,
    time,
    barber,
    people,
    subtotal: summary.subtotal,
    discount: summary.discount,
    total: summary.total,
    promotionTitle: summary.promotion ? summary.promotion.title : ""
  });

  persist();
  appointmentForm.reset();
  peopleList.innerHTML = "";
  addPerson();
  refreshPricePreview();
  renderAppointments();
});
