// Package notify provides compatibility stubs for notification data in older OQM
// configuration files. Outbound messaging integrations have been removed.
package notify

import "errors"

var errMessagingRemoved = errors.New("messaging notifications have been removed")

type TelegramNotifier struct{}

// NewTelegramNotifier remains temporarily for source compatibility with existing
// daemon and API call sites. It never creates a client or sends network requests.
func NewTelegramNotifier(_, _, _ string) (*TelegramNotifier, error) {
	return nil, errMessagingRemoved
}

func (*TelegramNotifier) SendToAdmin(string) error { return errMessagingRemoved }
func (*TelegramNotifier) SendToUser(string, string) error { return errMessagingRemoved }
func (*TelegramNotifier) NotifyQuotaWarning(string, string, string, float64) error {
	return errMessagingRemoved
}
func (*TelegramNotifier) NotifyQuotaExceeded(string, string, string, float64, float64) error {
	return errMessagingRemoved
}
func (*TelegramNotifier) NotifyDailyReport(string) error { return errMessagingRemoved }
func (*TelegramNotifier) NotifySystemEvent(string) error { return errMessagingRemoved }
func (*TelegramNotifier) NotifyUserReset(string, string, string) error { return errMessagingRemoved }

type UserUsage struct {
	IP    string
	Name  string
	Usage string
}

func FormatUsageReport([]UserUsage) string { return "" }
