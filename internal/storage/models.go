package storage

import "time"

// User represents a network user with quota limits.
type User struct {
	IP            string    `json:"ip"`
	MAC           string    `json:"mac"`
	Name          string    `json:"name"`
	Username      string    `json:"username"`
	QuotaMB       int64     `json:"quota_mb"`
	GroupQuotaMB  int64     `json:"group_quota_mb"`
	RxBytes       int64     `json:"rx_bytes"`
	TxBytes       int64     `json:"tx_bytes"`
	IsBlocked     bool      `json:"is_blocked"`
	// Deprecated legacy notification fields are retained only to avoid breaking
	// internal callers while old data is migrated; they are never read or serialized.
	TelegramChatID      string    `json:"-"`
	GroupTelegramChatID string    `json:"-"`
	DeviceWarningNotificationSent bool `json:"device_warning_notification_sent,omitempty"`
	GroupWarningNotificationSent bool `json:"group_warning_notification_sent,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (u *User) TotalBytes() int64 { return u.RxBytes + u.TxBytes }
func (u *User) TotalMB() float64 { return float64(u.TotalBytes()) / 1024 / 1024 }
func (u *User) QuotaUsagePercent() float64 {
	if u.QuotaMB == 0 { return 0 }
	return (u.TotalMB() / float64(u.QuotaMB)) * 100
}
func (u *User) IsQuotaExceeded() bool { return u.QuotaMB > 0 && u.TotalMB() >= float64(u.QuotaMB) }
func GroupQuotaUsagePercent(totalBytes int64, quotaMB int64) float64 {
	if quotaMB == 0 { return 0 }
	return (float64(totalBytes) / 1024 / 1024 / float64(quotaMB)) * 100
}
func IsGroupQuotaExceeded(totalBytes int64, quotaMB int64) bool {
	return quotaMB > 0 && float64(totalBytes)/1024/1024 >= float64(quotaMB)
}

// Config holds OQM configuration. Legacy messaging properties are ignored.
type Config struct {
	CheckInterval int `json:"check_interval"`
	WebPort int `json:"web_port"`
	BotType string `json:"-"`
	BotToken string `json:"-"`
	BotAPIBaseURL string `json:"-"`
	AdminChatID string `json:"-"`
	ResetSchedule string `json:"reset_schedule"`
	NFTablesTable string `json:"nftables_table"`
	DataDir string `json:"data_dir"`
	LogFile string `json:"log_file"`
}

func DefaultConfig() *Config {
	return &Config{CheckInterval: 60, WebPort: 8080, ResetSchedule: "monthly", NFTablesTable: "oqm", DataDir: "/etc/oqm", LogFile: "/var/log/oqm.log"}
}

type Data struct {
	Users []*User `json:"users"`
	Config *Config `json:"config"`
}
