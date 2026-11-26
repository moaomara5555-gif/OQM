'use strict';
'require view';
'require ui';

/* The OQM API remains the backend used by this LuCI application. */
var api = window.location.protocol + '//' + window.location.hostname + ':8080/api';
var refreshTimer;

function request(path, options) {
	options = options || {};
	options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
	return fetch(api + path, options).then(function(response) {
		return response.text().then(function(text) {
			var data = {};
			try { data = text ? JSON.parse(text) : {}; }
			catch (e) { throw new Error('The OQM API returned an invalid response.'); }
			if (!response.ok) throw new Error(data.error || response.statusText);
			return data;
		});
	});
}

function bytes(value) {
	var n = Number(value || 0), units = ['KB', 'MB', 'GB', 'TB'], i = -1;
	if (n < 1024) return n + ' B';
	do { n /= 1024; i++; } while (n >= 1024 && i < units.length - 1);
	return n.toFixed(1) + ' ' + units[i];
}

function cell(value) { return E('td', {}, [ value == null || value === '' ? '—' : String(value) ]); }
function button(label, click, cls) {
	return E('button', { 'class': 'btn cbi-button ' + (cls || ''), 'click': click }, [ label ]);
}
function field(label, value, type, attrs) {
	var control = E('input', Object.assign({
		'class': 'cbi-input-text', 'type': type || 'text', 'value': value == null ? '' : String(value)
	}, attrs || {}));
	return { node: E('div', { 'class': 'cbi-value' }, [
		E('label', { 'class': 'cbi-value-title' }, [ label ]),
		E('div', { 'class': 'cbi-value-field' }, [ control ])
	]), control: control };
}
function selectField(label, value, choices) {
	var control = E('select', { 'class': 'cbi-input-select' }, choices.map(function(choice) {
		return E('option', { 'value': choice[0], 'selected': String(value) === String(choice[0]) }, [ choice[1] ]);
	}));
	return { node: E('div', { 'class': 'cbi-value' }, [
		E('label', { 'class': 'cbi-value-title' }, [ label ]),
		E('div', { 'class': 'cbi-value-field' }, [ control ])
	]), control: control };
}
function notice(message) { ui.addNotification(null, E('p', {}, [ message ])); }

return view.extend({
	load: function() {
		return Promise.all([ request('/users'), request('/stats'), request('/config'), request('/usernames') ]);
	},

	render: function(data) {
		this.users = data[0] || [];
		this.stats = data[1] || {};
		this.config = data[2] || {};
		this.usernames = data[3] || [];
		this.expanded = this.expanded || {};
		this.root = this.buildPage();
		this.startRefresh();
		return this.root;
	},

	startRefresh: function() {
		var self = this;
		if (refreshTimer) clearInterval(refreshTimer);
		refreshTimer = setInterval(function() { self.reload(); }, Math.max(10, Number(this.config.check_interval || 60)) * 1000);
	},

	reload: function() {
		var self = this;
		return this.load().then(function(data) {
			self.users = data[0] || [];
			self.stats = data[1] || {};
			self.config = data[2] || {};
			self.usernames = data[3] || [];
			var next = self.buildPage();
			if (self.root && self.root.parentNode) self.root.parentNode.replaceChild(next, self.root);
			self.root = next;
			self.startRefresh();
		}).catch(function(err) { notice('Unable to load OQM data: ' + err.message); });
	},

	buildPage: function() {
		var self = this, root = E('div', { 'class': 'cbi-map' });
		this.root = root;
		root.appendChild(E('h2', {}, [ 'OQM Quota Manager' ]));
		root.appendChild(E('div', { 'class': 'cbi-section' }, [
			E('p', {}, [ 'Users: ' + (this.stats.total_users || 0) + ' · Active: ' + (this.stats.active_users || 0) +
				' · Blocked: ' + (this.stats.blocked_users || 0) + ' · Total traffic: ' + bytes(this.stats.total_traffic) ]),
			button('Refresh', function() { self.reload(); }, 'cbi-button-action'), ' ',
			button('DHCP Clients', function() { self.showDHCP(); }, 'cbi-button-positive'), ' ',
			button('Add User', function() { self.showUserForm(); }, 'cbi-button-add'), ' ',
			button('Reset All Usage', function() { self.resetAll(); }, 'cbi-button-reset'), ' ',
			button('Settings', function() { self.showSettings(); })
		]));

		var groups = {}, standalone = [];
		this.users.forEach(function(user) {
			if (user.username && user.username.trim()) (groups[user.username] = groups[user.username] || []).push(user);
			else standalone.push(user);
		});
		var rows = [];
		Object.keys(groups).sort().forEach(function(username) {
			var members = groups[username];
			var used = members.reduce(function(sum, user) { return sum + Number(user.rx_bytes || 0) + Number(user.tx_bytes || 0); }, 0);
			var quota = Math.max.apply(null, members.map(function(user) { return Number(user.group_quota_mb || 0); }));
			var blocked = members.some(function(user) { return !!user.is_blocked; });
			var online = members.some(function(user) { return !!user.is_online; });
			var expanded = !!self.expanded[username];
			rows.push(E('tr', { 'click': function() { self.expanded[username] = !self.expanded[username]; self.reload(); } }, [
				cell(online ? 'Online' : 'Offline'), cell((expanded ? '▼ ' : '▶ ') + username + ' (' + members.length + ' devices)'),
				cell('Group Total'), cell(quota ? quota + ' MB (group)' : 'Unlimited'), cell(bytes(used)),
				cell(quota ? (used / (quota * 1048576) * 100).toFixed(1) + '%' : 'Unlimited'),
				cell(blocked ? 'Blocked' : 'Active'), E('td', {}, [ button('Edit Group', function(ev) {
					if (ev && ev.stopPropagation) ev.stopPropagation(); self.showGroupForm(username, members);
				}) ])
			]));
			if (expanded) members.forEach(function(user) { rows.push(self.userRow(user, true)); });
		});
		standalone.forEach(function(user) { rows.push(self.userRow(user, false)); });
		var headings = ['Connection', 'IP / MAC / Group', 'Name', 'Quota', 'Total Usage', 'Usage %', 'Status', 'Actions'];
		root.appendChild(E('div', { 'class': 'cbi-section' }, [ E('table', { 'class': 'table' }, [
			E('thead', {}, [ E('tr', {}, headings.map(function(text) { return E('th', {}, [ text ]); })) ]),
			E('tbody', {}, rows.length ? rows : [ E('tr', {}, [ E('td', { 'colspan': '8' }, [ 'No OQM users configured.' ]) ]) ])
		]) ]));
		root.appendChild(this.topUsersPanel());
		return root;
	},

	userRow: function(user, isGrouped) {
		var self = this, ip = user.ip || '', mac = user.mac || '';
		var identifier = ip === '0.0.0.0' || !ip ? mac : (mac && mac !== '00:00:00:00:00:00' ? ip + ' / ' + mac : ip);
		var used = Number(user.rx_bytes || 0) + Number(user.tx_bytes || 0), quota = Number(user.quota_mb || 0);
		var percent = quota ? Math.min(100, used / (quota * 1048576) * 100) : 0;
		return E('tr', {}, [
			cell(user.is_online ? 'Online' : 'Offline'), cell(identifier), cell(user.name || '—'),
			cell((quota ? quota + ' MB' : 'Unlimited') + (isGrouped ? ' (device)' : '')),
			cell(bytes(used)), cell(quota ? percent.toFixed(1) + '%' : 'Unlimited'),
			cell(user.is_blocked ? 'Blocked' : 'Active'), E('td', {}, [
				button(user.is_blocked ? 'Activate' : 'Deactivate', function() { self.updateUser(ip, { is_blocked: !user.is_blocked }); }), ' ',
				button('Edit', function() { self.showUserForm(user); }), ' ',
				button('Delete', function() { self.deleteUser(user); }, 'cbi-button-negative')
			])
		]);
	},

	topUsersPanel: function() {
		var top = (this.stats.top_users || []).slice().sort(function(a, b) {
			return (Number(b.rx_bytes || 0) + Number(b.tx_bytes || 0)) - (Number(a.rx_bytes || 0) + Number(a.tx_bytes || 0));
		});
		var max = Math.max.apply(null, top.map(function(u) { return Number(u.rx_bytes || 0) + Number(u.tx_bytes || 0); }).concat([1]));
		return E('div', { 'class': 'cbi-section' }, [ E('h3', {}, [ 'Top Users by Traffic' ]), top.length ? E('div', {}, top.map(function(user) {
			var total = Number(user.rx_bytes || 0) + Number(user.tx_bytes || 0);
			return E('div', { 'class': 'cbi-value' }, [
				E('label', { 'class': 'cbi-value-title' }, [ user.name || user.ip || 'User' ]),
				E('div', { 'class': 'cbi-value-field' }, [ E('progress', { 'max': max, 'value': total }), ' ', bytes(total) ])
			]);
		})) : E('p', {}, [ 'No traffic data yet.' ]) ]);
	},

	updateUser: function(ip, payload) {
		var self = this;
		return request('/users/' + encodeURIComponent(ip), { method: 'PUT', body: JSON.stringify(payload) })
			.then(function() { return self.reload(); }).catch(function(err) { notice(err.message); });
	},

	deleteUser: function(user) {
		var self = this;
		if (!confirm('Remove OQM user ' + (user.name || user.ip || user.mac) + '?')) return;
		request('/users/' + encodeURIComponent(user.ip || ''), { method: 'DELETE' })
			.then(function() { return self.reload(); }).catch(function(err) { notice(err.message); });
	},

	resetAll: function() {
		var self = this;
		if (!confirm('Reset usage counters for all users?')) return;
		request('/reset-all', { method: 'POST' }).then(function() { notice('Usage counters reset.'); return self.reload(); })
			.catch(function(err) { notice(err.message); });
	},

	showDHCP: function() {
		var self = this;
		request('/dhcp-leases').then(function(leases) {
			var rows = (leases || []).map(function(lease) {
				return E('tr', {}, [ cell(lease.ip), cell(lease.mac), cell(lease.hostname), cell(lease.expires), E('td', {}, [
					button('Add User', function() { ui.hideModal(); self.showUserForm(null, lease); }, 'cbi-button-add') ]) ]);
			});
			ui.showModal('DHCP Clients', [ E('div', { 'class': 'table-wrapper' }, [ E('table', { 'class': 'table' }, [
				E('thead', {}, [ E('tr', {}, ['IP', 'MAC', 'Hostname', 'Expires', 'Action'].map(function(v) { return E('th', {}, [v]); })) ]),
				E('tbody', {}, rows.length ? rows : [ E('tr', {}, [ E('td', { 'colspan': '5' }, ['No active DHCP leases found.']) ]) ])
			]) ]), E('div', { 'class': 'right' }, [ button('Close', function() { ui.hideModal(); }) ]) ]);
		}).catch(function(err) { notice('Could not load DHCP clients: ' + err.message); });
	},

	showUserForm: function(user, lease) {
		var self = this, editing = !!user;
		user = user || {};
		var identifierType = selectField('Track device by', (lease && lease.mac) || (user.mac && user.mac !== '00:00:00:00:00:00') ? 'mac' : 'ip', [['ip', 'IP address'], ['mac', 'MAC address']]);
		var ip = field('IP Address', (lease && lease.ip) || (user.ip === '0.0.0.0' ? '' : user.ip), 'text');
		var mac = field('MAC Address', (lease && lease.mac) || (user.mac === '00:00:00:00:00:00' ? '' : user.mac), 'text');
		var name = field('Name', user.name, 'text');
		var groupChoices = [['', 'No group / create new']];
		(this.usernames || []).forEach(function(n) { groupChoices.push([n, n]); });
		var groupSelect = selectField('Existing group', user.username || '', groupChoices);
		var username = field('New group name (optional)', '', 'text');
		var quota = field('Device quota (MB; 0 = unlimited)', user.quota_mb == null ? 1024 : user.quota_mb, 'number', { 'min': '0' });
		var groupQuota = field('Shared group quota (MB; 0 = unlimited)', user.group_quota_mb || 0, 'number', { 'min': '0' });
		var telegram = field('Device Telegram/Bale Chat ID', user.telegram_chat_id, 'text');
		var groupTelegram = field('Group Telegram/Bale Chat ID', user.group_telegram_chat_id, 'text');
		var setIdVisibility = function() {
			ip.node.style.display = identifierType.control.value === 'ip' ? '' : 'none';
			mac.node.style.display = identifierType.control.value === 'mac' ? '' : 'none';
		};
		identifierType.control.addEventListener('change', setIdVisibility);
		groupSelect.control.addEventListener('change', function() {
			if (groupSelect.control.value) {
				username.control.value = '';
				var member = self.users.find(function(u) { return u.username === groupSelect.control.value; });
				if (member) { groupQuota.control.value = member.group_quota_mb || 0; groupTelegram.control.value = member.group_telegram_chat_id || ''; }
			}
		});
		setIdVisibility();
		if (editing) { identifierType.node.style.display = 'none'; ip.node.style.display = 'none'; mac.node.style.display = 'none'; }
		var body = E('div', {}, [identifierType.node, ip.node, mac.node, name.node, groupSelect.node, username.node, quota.node, groupQuota.node, telegram.node, groupTelegram.node]);
		ui.showModal(editing ? 'Edit User' : 'Add User', [ body, E('div', { 'class': 'right' }, [
			button('Cancel', function() { ui.hideModal(); }), ' ',
			button(editing ? 'Save User' : 'Add User', function() {
				var group = username.control.value.trim() || groupSelect.control.value;
				var payload = { name: name.control.value, username: group, quota_mb: Number(quota.control.value || 0),
					group_quota_mb: Number(groupQuota.control.value || 0), telegram_chat_id: telegram.control.value,
					group_telegram_chat_id: groupTelegram.control.value };
				var path = editing ? '/users/' + encodeURIComponent(user.ip || '') : '/users';
				if (!editing) {
					payload.ip = identifierType.control.value === 'mac' ? '0.0.0.0' : ip.control.value.trim();
					payload.mac = identifierType.control.value === 'mac' ? mac.control.value.trim() : '00:00:00:00:00:00';
					payload.rx_bytes = 0; payload.tx_bytes = 0; payload.is_blocked = false;
					if (identifierType.control.value === 'ip' && !payload.ip) { notice('IP address is required.'); return; }
					if (identifierType.control.value === 'mac' && !payload.mac) { notice('MAC address is required.'); return; }
				}
				request(path, { method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload) }).then(function() {
					ui.hideModal(); notice(editing ? 'User updated.' : 'User added.'); return self.reload();
				}).catch(function(err) { notice(err.message); });
			}, 'cbi-button-action')
		]) ]);
	},

	showGroupForm: function(username, members) {
		var self = this;
		var quota = field('Shared group quota (MB; 0 = unlimited)', Math.max.apply(null, members.map(function(u) { return Number(u.group_quota_mb || 0); })), 'number', { 'min': '0' });
		var chat = field('Group Telegram/Bale Chat ID', members[0].group_telegram_chat_id || '', 'text');
		ui.showModal('Edit Group: ' + username, [ E('div', {}, [quota.node, chat.node]), E('div', { 'class': 'right' }, [
			button('Cancel', function() { ui.hideModal(); }), ' ', button('Save Group', function() {
				Promise.all(members.map(function(member) {
					return request('/users/' + encodeURIComponent(member.ip), { method: 'PUT', body: JSON.stringify({
						group_quota_mb: Number(quota.control.value || 0), group_telegram_chat_id: chat.control.value
					}) });
				})).then(function() { ui.hideModal(); return self.reload(); }).catch(function(err) { notice(err.message); });
			}, 'cbi-button-action')
		]) ]);
	},

	showSettings: function() {
		var self = this, cfg = this.config;
		var interval = field('Check interval (seconds)', cfg.check_interval, 'number', { 'min': '10', 'max': '300' });
		var port = field('API port (requires service restart)', cfg.web_port, 'number', { 'min': '1024', 'max': '65535' });
		var schedule = selectField('Reset schedule', cfg.reset_schedule || 'monthly', [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']]);
		var botType = selectField('Bot type', cfg.bot_type || 'telegram', [['telegram', 'Telegram'], ['bale', 'Bale'], ['custom', 'Custom API endpoint']]);
		var token = field('Bot token', cfg.bot_token, 'password');
		var baseURL = field('Custom Bot API base URL (optional)', cfg.bot_api_base_url, 'text');
		var admin = field('Admin chat ID', cfg.admin_chat_id, 'text');
		var test = button('Test Bot Connection', function() {
			request('/test-telegram', { method: 'POST' }).then(function(result) { notice(result.message || 'Test message sent.'); })
				.catch(function(err) { notice(err.message); });
		}, 'cbi-button-positive');
		ui.showModal('OQM Settings', [ E('div', {}, [
			E('h3', {}, ['General']), interval.node, port.node, schedule.node,
			E('h3', {}, ['Bot Notifications']), botType.node, token.node, baseURL.node, admin.node, test,
			E('p', {}, ['Configure Telegram, Bale, or a compatible custom API.']), E('h3', {}, ['Advanced']),
			E('p', {}, ['Data directory: ' + (cfg.data_dir || '/etc/oqm') + ' · Log file: ' + (cfg.log_file || '/var/log/oqm.log')])
		]), E('div', { 'class': 'right' }, [ button('Cancel', function() { ui.hideModal(); }), ' ', button('Save Settings', function() {
			request('/config', { method: 'PUT', body: JSON.stringify({
				check_interval: Number(interval.control.value), web_port: Number(port.control.value), reset_schedule: schedule.control.value,
					bot_type: botType.control.value, bot_token: token.control.value, bot_api_base_url: baseURL.control.value, admin_chat_id: admin.control.value
			}) }).then(function() { ui.hideModal(); notice('Settings saved.'); return self.reload(); }).catch(function(err) { notice(err.message); });
		}, 'cbi-button-action') ]) ]);
	},

	cleanup: function() { if (refreshTimer) clearInterval(refreshTimer); }
});
