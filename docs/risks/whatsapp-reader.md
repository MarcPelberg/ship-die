# WhatsApp Reader Risk

Baileys is an unofficial WhatsApp Web client. The reader must stay isolated to the dedicated Mexican WhatsApp account and the adapter layer so any protocol, auth, or dependency issue does not spread into the rest of the app.

The reader uses Baileys 7.0.0-rc14 with its supported Signal dependency and bundled connection defaults. Keep the lockfile and the reader image in sync. Verify QR generation, reconnection, and group scoping when updating the client. A linked device can receive partial history, and the database holds delivered messages from before activation separately for reconciliation.
