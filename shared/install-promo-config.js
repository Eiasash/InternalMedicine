/* Per-app config for shared install-promo.js. Loaded BEFORE install-promo.js.
 * CSP forbids inline scripts in pnimit-mega.html (script-src 'self'), so the
 * config can't go in a <script>...</script> block — it has to be its own file. */
window.PWA_INSTALL_CONFIG = { appName: 'Pnimit Mega' };
