# SortSearch: shopping search starter

Your existing design, connected to SerpApi's Google Shopping API. No npm packages are required.

## Mac setup

1. Keep a backup of your original project. Unzip this download and open the SortSearch-live folder in VS Code (File > Open Folder).
2. Install the LTS version of Node.js from https://nodejs.org/en/download if needed. Restart VS Code after installing.
3. Open Terminal > New Terminal in VS Code. Confirm `node --version` works (use Node 22 or newer).
4. Run `cp .env.example .env`. Open the new `.env` file in VS Code and replace PASTE_YOUR_KEY_HERE with your private SerpApi key. Save. Never upload .env to GitHub or share your key.
5. Run `node --env-file=.env server.mjs`.
6. Visit http://localhost:3000 in your browser. Do not double-click index.html. Keep the terminal running; Control+C stops the server.

Search with a product name, then click Price: Low to High. Typing and sorting do not call the API. Matching searches reuse results for 15 minutes; restart clears this cache. A local limit allows 20 provider requests per server session; failed calls count toward this safety limit. Check your actual monthly quota in SerpApi's dashboard.

## Scope

This searches the first returned page of US shopping listings, not every store. Sorting applies only to those results and simple listed USD prices; missing prices, ranges, and other formats appear last. Shipping and taxes are not included in sorting. Different variants, conditions, accessories, and sellers can appear. Sellers have not been vetted. Use a specific model name and check the listing. Links can open Google Shopping rather than a direct seller page. Retrieved time means when this server received data; the provider may use cached data.

The server listens only on your computer. This is a local development starter, not a published site. GitHub Pages cannot run server.mjs. Before public deployment, add durable quota controls and appropriate access/rate limiting on a backend host, and configure its secret environment variable. The in-memory limit is not a monthly billing cap.

Documentation: https://serpapi.com/google-shopping-api

## Validation

Run `node --test server.test.mjs` for offline tests with simulated provider responses. Real searches require your key and available quota.
