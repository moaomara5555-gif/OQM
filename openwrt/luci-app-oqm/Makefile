include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-oqm
PKG_VERSION:=1.1.1
PKG_RELEASE:=1

PKG_LICENSE:=MIT
PKG_MAINTAINER:=OQM contributors

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-oqm
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI Support for OQM (OpenWrt Quota Manager)
  DEPENDS:=+oqm +luci-base
  PKGARCH:=all
endef

define Package/luci-app-oqm/description
  Native LuCI interface for OQM user, group, quota, DHCP and notification management.
endef

define Build/Compile
endef

define Package/luci-app-oqm/install
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/controller
	$(INSTALL_DATA) ./luasrc/controller/oqm.lua $(1)/usr/lib/lua/luci/controller/
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/oqm
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/oqm/overview.js $(1)/www/luci-static/resources/view/oqm/
endef

$(eval $(call BuildPackage,luci-app-oqm))
