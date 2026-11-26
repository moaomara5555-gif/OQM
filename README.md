# OQM - OpenWrt Quota Manager

A lightweight quota management system for OpenWrt with a native LuCI interface, device and group quotas, automatic blocking, notifications, DHCP discovery, traffic summaries, and CLI tools.

## Interface

Manage OQM in LuCI under **Network → Quota Manager**. Install both the `oqm` backend and `luci-app-oqm` package. The backend API on port 8080 is required by LuCI; the standalone dashboard has been retired. The LuCI users table shows combined total usage without separate upload/download columns.

## Features

- Per-device and shared group quotas, with automatic block/unblock
- Total traffic usage summaries and top users
- IP or MAC device tracking and DHCP lease discovery
- Telegram, Bale, and custom-compatible bot configuration
- Daily, weekly, and monthly usage resets
- CLI for automation and administration

## Install and develop

See [LuCI app instructions](openwrt/luci-app-oqm/README.md).

```sh
make build
make test
```
