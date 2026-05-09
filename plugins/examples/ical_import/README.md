# iCal import plugin

Imports calendar events from `.ics` files as nodes. Demonstrates the `on-command` pattern combined with `subgraph` write capability.

Reference plugin. Status: scaffold only — implementation lands in M2.

## Capabilities

- `subgraph` (write): the plugin needs to create nodes of kind `event` and link them to a `calendar` parent.
- `kv`: stores the import state (which UIDs have been imported) so re-importing a file doesn't create duplicates.

## How it surfaces in the UI (post-M2)

The user invokes `/import-ics`, picks a `.ics` file via the host's file picker, and the plugin walks the VEVENTs creating one node per event.
