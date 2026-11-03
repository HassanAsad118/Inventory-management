const authPanel = document.querySelector("#auth-panel");
const accountPanel = document.querySelector("#account-panel");
const message = document.querySelector("#message");
const productForm = document.querySelector("#product-form");
const productMessage = document.querySelector("#product-message");

let products = [];
const money = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
});

function showMessage(text) {
    message.textContent = text;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
    })[char]);
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
    const lowOnly = document.querySelector("#stock-filter").value === "low";

    const visible = products.filter((p) =>
        (!search || `${p.name} ${p.sku}`.toLowerCase().includes(search)) &&
        (!category || p.category === category) &&
        (!lowOnly || p.quantity <= 5)
    );

    document.querySelector("#product-rows").innerHTML = visible.map((p) => `
    <tr>
      <td>${escapeHTML(p.name)}</td>
      <td>${escapeHTML(p.sku)}</td>
      <td>${escapeHTML(p.category)}</td>
      <td>${p.quantity}</td>
      <td>${money.format(p.price)}</td>
      <td>
        <button data-action="edit" data-id="${p._id}">Edit</button>
        <button class="danger" data-action="delete" data-id="${p._id}">Delete</button>
      </td>
    </tr>
  `).join("") || '<tr><td colspan="6">No products found.</td></tr>';
}

async function loadDashboard() {
    try {
        products = await api("/api/products");

        document.querySelector("#stat-products").textContent = products.length;
        document.querySelector("#stat-units").textContent =
            products.reduce((sum, p) => sum + p.quantity, 0);
        document.querySelector("#stat-low").textContent =
            products.filter((p) => p.quantity <= 5).length;
        document.querySelector("#stat-value").textContent =
            money.format(products.reduce((sum, p) => sum + p.quantity * p.price, 0));

        const categoryFilter = document.querySelector("#category-filter");
        const previous = categoryFilter.value;
        const categories = [...new Set(products.map((p) => p.category))].sort();
        categoryFilter.innerHTML = '<option value="">All categories</option>' +
            categories.map((c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
        categoryFilter.value = categories.includes(previous) ? previous : "";

        renderProducts();

        const activity = await api("/api/products/activity");
        document.querySelector("#activity-list").innerHTML = activity.map((item) =>
            `<li>${escapeHTML(item.action)}: ${escapeHTML(item.productName)}</li>`
        ).join("") || "<li>No activity yet.</li>";
    } catch (error) {
        productMessage.textContent = error.message;
    }
}

async function sendForm(url, form) {
    const body = Object.fromEntries(new FormData(form));
    const response = await api(url, {
        method: "POST",
        body: JSON.stringify(body),
    });
    return response;
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

document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
        showUser(await sendForm("/api/auth/login", event.currentTarget));
    } catch (error) {
        showMessage(error.message);
    }
});

document.querySelector("#register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
        showUser(await sendForm("/api/auth/register", event.currentTarget));
    } catch (error) {
        showMessage(error.message);
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
        productForm.reset();
        document.querySelector("#save-product").textContent = "Add product";
        document.querySelector("#cancel-edit").hidden = true;
        productMessage.textContent = id ? "Product updated." : "Product added.";
        await loadDashboard();
    } catch (error) {
        productMessage.textContent = error.message;
    }
});

document.querySelector("#cancel-edit").addEventListener("click", () => {
    productForm.reset();
    document.querySelector("#save-product").textContent = "Add product";
    document.querySelector("#cancel-edit").hidden = true;
    productMessage.textContent = "";
});

document.querySelector("#product-rows").addEventListener("click", async (event) => {
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
        productMessage.textContent = "Editing product.";
        return;
    }

    if (confirm(`Delete ${product.name}?`)) {
        try {
            await api(`/api/products/${product._id}`, { method: "DELETE" });
            productMessage.textContent = "Product deleted.";
            await loadDashboard();
        } catch (error) {
            productMessage.textContent = error.message;
        }
    }
});

["#search", "#category-filter", "#stock-filter"].forEach((selector) => {
    document.querySelector(selector).addEventListener("input", renderProducts);
    document.querySelector(selector).addEventListener("change", renderProducts);
});

document.querySelector("#logout-button").addEventListener("click", async () => {
    try {
        await api("/api/auth/logout", { method: "POST" });
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
    .catch(() => { });