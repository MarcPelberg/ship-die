# WhatsApp Reader Risk

Baileys is an unofficial WhatsApp Web client. The reader must stay isolated to the dedicated Mexican WhatsApp account and the adapter layer so any protocol, auth, or dependency issue does not spread into the rest of the app.

As of the current scaffold, Baileys pulls `libsignal`, which includes `protobufjs@6.8.8`. npm reports this transitive dependency as critically vulnerable. The scaffold forces `libsignal` through the npm registry instead of a GitHub SSH dependency so Docker/CI installs do not require GitHub SSH credentials, but this does not fix the underlying protobuf vulnerability. This risk is documented until Baileys/libsignal ships a fixed dependency path or the reader adapter is replaced.
