module("luci.controller.oqm", package.seeall)

function index()
    entry({"admin", "network", "oqm"}, view("oqm/overview"), _("Quota Manager"), 60)
end
