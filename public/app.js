const authPanel = document.querySelector("#auth-panel");
const accountPanel = document.querySelector("#account-panel");
const message = document.querySelector("#message");
const productForm = document.querySelector("#product-form");
const productMessage = document.querySelector("#product-message");

let products = [];
let currentPage = 1;
let dashboardRequest = 0;
const pageSize = 10;
const money = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 2,
});

function showMessage(text, isError = false) {
  message.dataset.error = String(isError);
  message.textContent = text;
}

function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char],
  );
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function showUser(user) {
  authPanel.hidden = true;
  accountPanel.hidden = false;
  document.querySelector("#user-name").textContent = user.name;
  showMessage("");
  loadDashboard();
}

function renderProducts() {
  const search = document.querySelector("#search").value.trim().toLowerCase();
  const category = document.querySelector("#category-filter").value;
  const stock = document.querySelector("#stock-filter").value;

  const visible = products.filter(
    (p) =>
      (!search || `${p.name} ${p.sku}`.toLowerCase().includes(search)) &&
      (!category || p.category === category) &&
      (stock !== "low" || p.quantity <= 5) &&
      (stock !== "empty" || p.quantity === 0),
  );

  const order = document.querySelector("#sort").value;
  if (order === "quantity") visible.sort((a, b) => a.quantity - b.quantity);
  if (order === "value")
    visible.sort((a, b) => b.quantity * b.price - a.quantity * a.price);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  currentPage = Math.min(currentPage, pageCount);
  const offset = (currentPage - 1) * pageSize;
  const rows = visible.slice(offset, offset + pageSize);
  document.querySelector("#pagination").hidden = pageCount === 1;
  document.querySelector("#prev-page").disabled = currentPage === 1;
  document.querySelector("#next-page").disabled = currentPage === pageCount;
  document.querySelector("#page-summary").textContent =
    `Page ${currentPage} of ${pageCount}`;
  document.querySelector("#count").textContent = visible.length
    ? `Showing ${offset + 1}–${offset + rows.length} of ${visible.length} matching products`
    : "0 matching products";
  document.querySelector("#product-rows").innerHTML =
    rows
      .map(
        (p) => `
    <tr>
      <td>${escapeHTML(p.name)}</td>
      <td>${escapeHTML(p.sku)}</td>
      <td>${escapeHTML(p.category)}</td>
      <td>${p.quantity} <small class="badge ${p.quantity === 0 ? "empty" : p.quantity <= 5 ? "low" : ""}">${p.quantity === 0 ? "Out of stock" : p.quantity <= 5 ? "Low stock" : "In stock"}</small></td>
      <td>${money.format(p.price)}</td>
      <td>
        <button data-action="edit" data-id="${p._id}">Edit</button>
        <button class="danger" data-action="delete" data-id="${p._id}">Delete</button>
      </td>
    </tr>
  `,
      )
      .join("") || '<tr><td colspan="6">No products found.</td></tr>';
}

async function loadDashboard() {
  const request = ++dashboardRequest;
  try {
    const result = await api("/api/products");
    if (request !== dashboardRequest) return;
    products = result;

    document.querySelector("#stat-products").textContent = products.length;
    document.querySelector("#stat-units").textContent = products.reduce(
      (sum, p) => sum + p.quantity,
      0,
    );
    document.querySelector("#stat-low").textContent = products.filter(
      (p) => p.quantity <= 5,
    ).length;
    document.querySelector("#stat-value").textContent = money.format(
      products.reduce((sum, p) => sum + p.quantity * p.price, 0),
    );

    const categoryFilter = document.querySelector("#category-filter");
    const previous = categoryFilter.value;
    const categories = [...new Set(products.map((p) => p.category))].sort();
    categoryFilter.innerHTML =
      '<option value="">All categories</option>' +
      categories
        .map(
          (c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`,
        )
        .join("");
    categoryFilter.value = categories.includes(previous) ? previous : "";

    renderProducts();

    const activity = await api("/api/products/activity");
    if (request !== dashboardRequest) return;
    document.querySelector("#activity-list").innerHTML =
      activity
        .map(
          (item) =>
            `<li>${escapeHTML(item.action)}: ${escapeHTML(item.productName)} <time>${new Date(item.createdAt).toLocaleString()}</time></li>`,
        )
        .join("") || "<li>No activity yet.</li>";
  } catch (error) {
    if (request === dashboardRequest) showMessage(error.message, true);
  }
}

async function sendForm(url, form) {
  const body = Object.fromEntries(new FormData(form));
  return api(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

document.querySelector("#show-login").addEventListener("click", () => {
  document.querySelector("#login-form").hidden = false;
  document.querySelector("#register-form").hidden = true;
  showMessage("");
});

document.querySelector("#show-register").addEventListener("click", () => {
  document.querySelector("#login-form").hidden = true;
  document.querySelector("#register-form").hidden = false;
  showMessage("");
});

document
  .querySelector("#login-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      showUser(await sendForm("/api/auth/login", event.currentTarget));
    } catch (error) {
      showMessage(error.message, true);
    }
  });

document
  .querySelector("#register-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      showUser(await sendForm("/api/auth/register", event.currentTarget));
    } catch (error) {
      showMessage(error.message, true);
    }
  });

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(productForm);
  const id = form.get("productId");
  const body = {
    name: form.get("name"),
    sku: form.get("sku"),
    category: form.get("category"),
    quantity: Number(form.get("quantity")),
    price: Number(form.get("price")),
  };

  try {
    await api(id ? `/api/products/${id}` : "/api/products", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
    resetEditor();
    document.querySelector("#catalog").focus();
    showMessage(id ? "Product updated." : "Product added.");
    await loadDashboard();
  } catch (error) {
    productMessage.textContent = error.message;
  }
});

function resetEditor() {
  document.querySelector("#editor-title").textContent = "Add a product";
  productForm.reset();
  document.querySelector("#save-product").textContent = "Add product";
  document.querySelector("#cancel-edit").hidden = true;
  productMessage.textContent = "";
  productForm.elements.productId.value = "";
}
function openEditor() {
  document.querySelector("#editor").scrollIntoView();
  productForm.elements.name.focus({ preventScroll: true });
}
document.querySelector("#new-product").onclick = () => {
  resetEditor();
  openEditor();
};
document.querySelector("#cancel-edit").onclick = () => {
  resetEditor();
  document.querySelector("#catalog").focus();
};
document.querySelector("#restock").onclick = () => {
  document.querySelector("#search").value = "";
  document.querySelector("#category-filter").value = "";
  document.querySelector("#stock-filter").value = "low";
  document.querySelector("#sort").value = "quantity";
  currentPage = 1;
  renderProducts();
  document.querySelector("#catalog").focus();
};

document
  .querySelector("#product-rows")
  .addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const product = products.find((p) => p._id === button.dataset.id);
    if (!product) return;

    if (button.dataset.action === "edit") {
      productForm.elements.productId.value = product._id;
      productForm.elements.name.value = product.name;
      productForm.elements.sku.value = product.sku;
      productForm.elements.category.value = product.category;
      productForm.elements.quantity.value = product.quantity;
      productForm.elements.price.value = product.price;
      document.querySelector("#save-product").textContent = "Save changes";
      document.querySelector("#cancel-edit").hidden = false;
      document.querySelector("#editor-title").textContent =
        "Edit " + product.name;
      productMessage.textContent = "";
      openEditor();
      return;
    }

    if (confirm(`Delete ${product.name}?`)) {
      try {
        await api(`/api/products/${product._id}`, { method: "DELETE" });
        if (productForm.elements.productId.value === product._id) resetEditor();
        showMessage("Product deleted.");
        await loadDashboard();
      } catch (error) {
        productMessage.textContent = error.message;
      }
    }
  });

["#search", "#category-filter", "#stock-filter", "#sort"].forEach(
  (selector) => {
    const field = document.querySelector(selector);
    field.addEventListener(selector === "#search" ? "input" : "change", () => {
      currentPage = 1;
      renderProducts();
    });
  },
);

document.querySelector("#prev-page").onclick = () => {
  currentPage--;
  renderProducts();
};
document.querySelector("#next-page").onclick = () => {
  currentPage++;
  renderProducts();
};

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
    resetEditor();
    document
      .querySelectorAll(".filters input, .filters select")
      .forEach((field) => (field.value = ""));
    document.querySelector("#sort").value = "recent";
    dashboardRequest++;
    currentPage = 1;
    products = [];
    renderProducts();
    document.querySelector("#category-filter").innerHTML =
      '<option value="">All categories</option>';
    document.querySelector("#activity-list").replaceChildren();
    document
      .querySelectorAll(".stats strong")
      .forEach((stat) => (stat.textContent = "0"));
    document.querySelector("#register-form").reset();
    accountPanel.hidden = true;
    authPanel.hidden = false;
    document.querySelector("#login-form").reset();
    showMessage("You have logged out.");
  } catch (error) {
    productMessage.textContent = error.message;
  }
});

api("/api/auth/me")
  .then(showUser)
  .catch(() => {});
const themeButton = document.querySelector("#theme");
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.setAttribute("aria-pressed", String(theme === "dark"));
}
applyTheme(
  localStorage.getItem("theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
);
themeButton.onclick = () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(theme);
  localStorage.setItem("theme", theme);
};
