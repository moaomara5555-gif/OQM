'use strict';
'require view';
'require ui';

var api = 'http://' + window.location.hostname + ':8080/api';

function request(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    return fetch(api + path, options).then(function(response) {
        return response.json().then(function(data) {
            if (!response.ok)
                throw new Error(data.error || response.statusText);
            return data;
        });
    });
}

function cell(value) {
    return E('td', {}, value == null ? '-' : String(value));
}

function formatBytes(bytes) {
    bytes = Number(bytes || 0);
    if (bytes < 1024) return bytes + ' B';
    var units = ['KB', 'MB', 'GB', 'TB'];
    var unit = -1;
    do { bytes /= 1024; unit++; } while (bytes >= 1024 && unit < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[unit];
}

return view.extend({
    load: function() {
        return Promise.all([request('/users'), request('/stats')]);
    },

    render: function(data) {
        var users = data[0] || [];
        var stats = data[1] || {};
        var self = this;
        var rows = users.map(function(user) {
            var ip = user.ip || '';
            var toggle = E('button', {
                'class': 'btn cbi-button ' + (user.is_blocked ? 'cbi-button-positive' : 'cbi-button-negative'),
                'click': function() {
                    request('/users/' + encodeURIComponent(ip), {
                        method: 'PUT', body: JSON.stringify({ is_blocked: !user.is_blocked })
                    }).then(function() { self.load().then(self.render.bind(self)); })
                      .catch(function(err) { ui.addNotification(null, E('p', {}, err.message)); });
                }
            }, [ user.is_blocked ? 'Unblock' : 'Block' ]);
            var remove = E('button', {
                'class': 'btn cbi-button cbi-button-remove',
                'click': function() {
                    if (!confirm('Remove OQM user ' + ip + '?')) return;
                    request('/users/' + encodeURIComponent(ip), { method: 'DELETE' })
                        .then(function() { self.load().then(self.render.bind(self)); })
                        .catch(function(err) { ui.addNotification(null, E('p', {}, err.message)); });
                }
            }, [ 'Remove' ]);
            return E('tr', {}, [
                cell(user.name || user.username || ip), cell(ip),
                cell(user.is_online ? 'Online' : 'Offline'),
                cell(user.is_blocked ? 'Blocked' : 'Active'),
                cell(formatBytes(Number(user.rx_bytes || 0) + Number(user.tx_bytes || 0))),
                cell(user.quota_mb ? user.quota_mb + ' MB' : 'Unlimited'),
                E('td', {}, [ toggle, ' ', remove ])
            ]);
        });

        var refresh = E('button', {
            'class': 'btn cbi-button cbi-button-action',
            'click': function() { self.load().then(self.render.bind(self)); }
        }, [ 'Refresh' ]);
        var reset = E('button', {
            'class': 'btn cbi-button cbi-button-reset',
            'click': function() {
                if (!confirm('Reset usage counters for all users?')) return;
                request('/reset-all', { method: 'POST' })
                    .then(function() { self.load().then(self.render.bind(self)); })
                    .catch(function(err) { ui.addNotification(null, E('p', {}, err.message)); });
            }
        }, [ 'Reset all usage' ]);

        return E('div', { 'class': 'cbi-map' }, [
            E('h2', {}, [ 'OQM Quota Manager' ]),
            E('div', { 'class': 'cbi-section' }, [
                E('p', {}, [ 'Users: ' + (stats.total_users || 0) +
                    ' · Active: ' + (stats.active_users || 0) +
                    ' · Blocked: ' + (stats.blocked_users || 0) +
                    ' · Traffic: ' + formatBytes(stats.total_traffic) ]),
                refresh, ' ', reset
            ]),
            E('div', { 'class': 'cbi-section' }, [
                E('table', { 'class': 'table' }, [
                    E('thead', {}, [ E('tr', {}, [
                        E('th', {}, [ 'Name' ]), E('th', {}, [ 'IP' ]),
                        E('th', {}, [ 'Status' ]), E('th', {}, [ 'Quota state' ]),
                        E('th', {}, [ 'Usage' ]), E('th', {}, [ 'Quota' ]),
                        E('th', {}, [ 'Actions' ])
                    ]) ]),
                    E('tbody', {}, rows.length ? rows : [ E('tr', {}, [ E('td', { 'colspan': '7' }, [ 'No OQM users configured.' ]) ]) ])
                ])
            ])
        ]);
    }
});
