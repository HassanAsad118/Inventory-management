# Inventory Management

A stock register built for Task 04 of the Devixo Solutions Web Development Internship. Each user has a private workspace for tracking products, quantities, unit prices in Pakistani rupees (PKR), and recent inventory changes.

**[Open the live app](https://inventory-management-one-sand.vercel.app/)**

## Using the app

1. Register or log in. A new account starts with an empty register.
2. Select **Add product** and enter its name, SKU, category, quantity, and unit price. Each SKU must be unique within your account.
3. Select **Review low stock** to find products with five units or fewer. Choose **Edit** to change a product or **Delete** to remove it after confirmation.
4. Open **Recent activity** to see the ten most recent additions, edits, and deletions with timestamps.

## Features

| Area | Details |
| --- | --- |
| Stock overview | Product count, total units, products needing restocking, and stock value calculated as quantity × unit price summed across the register |
| Availability | In stock (6+ units), low (1–5), and empty (0) |
| Product management | Create, read, update, and delete products stored in MongoDB |
| Search and pagination | Search by name or SKU, filter by category or stock status, and browse ten matching products per page |
| Sorting | Newest first, lowest quantity first, or highest total stock value first |
| Interface | Responsive desktop and mobile layouts, dark mode, active section navigation, and an editor that scrolls into view |

## Screenshots

| View | Screenshot |
| --- | --- |
| Sign-in page | ![Login page](screenshots/login.png) |
| Dashboard and stock register | ![Dashboard showing inventory statistics](screenshots/dashboard.png) |
| Low-stock filter | ![Inventory table with search and filters](screenshots/inventory.png) |
| Mobile dashboard in dark mode | ![Mobile Dark mode](screenshots/mobile.png) |

<!-- Save images under docs/screenshots/ and replace a placeholder with Markdown such as ![Dashboard and stock register](docs/screenshots/dashboard.png). -->

## Stack

The frontend uses HTML, CSS, and vanilla JavaScript. It calls a Node.js and Express API using Fetch. MongoDB Atlas stores the data, with Mongoose models for users, products, and activity. Vercel hosts the frontend and the API.

## Run locally

Use Node.js 24.x, npm, and a MongoDB database. If using Atlas, configure a database user and allow your development machine's IP in the project's network access settings.

1. Clone this repository and open a terminal in the folder containing `package.json`.
2. Install the dependencies with `npm ci`.
3. Create a file named `.env` in the project root and replace the example values below. Use your own Atlas connection string with the inventory database name. Encode reserved characters in the password once when putting it in the URI.

   ```dotenv
   MONGODB_URI=mongodb+srv://DB_USER:ENCODED_PASSWORD@CLUSTER_HOST/devixo_inventory?retryWrites=true&w=majority
   SESSION_SECRET=YOUR_RANDOM_SECRET
   ```

   To generate a session secret:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

4. Run `npm start` and open [localhost:3000](http://localhost:3000).

## Authentication and security

Registration validates the email address and password. Passwords must contain at least eight characters and fit within bcrypt's 72-byte limit. The server stores bcrypt password hashes. Express regenerates the session at registration and login, and destroys it on logout. Sessions are stored in MongoDB using connect-mongo. The session cookie is HTTP-only and uses HTTPS in production.

Product and activity routes require a signed-in user. Queries use the account ID from the session so each person sees their own inventory. The API validates quantities and prices and rejects duplicate SKUs within the same account.

## Deployment

Import the repository into Vercel using the Express preset and the repository root. Configure `MONGODB_URI`, `SESSION_SECRET`, and `NODE_ENV=production` for Production, and configure Atlas network access for the backend. Keep credentials in environment settings. Redeploy after changing a production variable.

Open `/api/health` to check the server. Before login, `/api/products` should return HTTP 401. To check the database connection and session together, sign in, add a product, and refresh the page.
