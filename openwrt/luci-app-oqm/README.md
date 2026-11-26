# OQM LuCI App

Native LuCI dashboard for OQM. It uses the OQM API service on port 8080 and supports user/device management, grouped quotas, total-usage summaries, DHCP lease discovery, block/unblock, and usage resets.

## Install

Build and install both the `oqm` and `luci-app-oqm` OpenWrt packages. The OQM API/daemon service must be running on port 8080; LuCI connects to `http://<router-address>:8080/api`. Open **Network → Quota Manager** in LuCI.

The API service is required as LuCI's backend. The standalone dashboard and Telegram/Bale integrations are not supported.
