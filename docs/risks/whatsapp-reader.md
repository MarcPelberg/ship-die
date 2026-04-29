# WhatsApp Reader Risk

Baileys is an unofficial WhatsApp Web client. The reader must stay isolated to the dedicated Mexican WhatsApp account and the adapter layer so any protocol, auth, or dependency issue does not spread into the rest of the app.

As of the current scaffold, Baileys pulls `libsignal` from the WhiskeySockets git dependency, which includes `protobufjs@6.8.8`. npm reports this transitive dependency as critically vulnerable. There is no safe local package override in this scaffold that fixes the git dependency without changing the WhatsApp reader architecture, so this risk is documented until Baileys/libsignal ships a fixed dependency path.
