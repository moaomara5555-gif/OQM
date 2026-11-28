package main

import (
	"fmt"
	"os"

	"github.com/abdollahzadehghalejoghi/oqm/internal/cli"
	"github.com/spf13/cobra"
)

var version = "dev"

func newRootCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "oqm",
		Short:   "OpenWrt Quota Manager",
		Long:    "OQM manages network-device quotas and provides the API used by the LuCI interface.",
		SilenceUsage: true,
		SilenceErrors: true,
	}

	cmd.AddCommand(
		cli.NewListCommand(),
		cli.NewAddUserCommand(),
		cli.NewRemoveUserCommand(),
		cli.NewUpdateQuotaCommand(),
		cli.NewUsageCommand(),
		cli.NewTopCommand(),
		cli.NewBlockCommand(),
		cli.NewUnblockCommand(),
		cli.NewResetUsageCommand(),
		cli.NewConfigCommand(),
		cli.NewDaemonCommand(),
		cli.NewNftCommand(),
		cli.NewScanDHCPCommand(),
		cli.NewExportCommand(),
		cli.NewImportCommand(),
		cli.NewWebCommand(),
	)

	cmd.AddCommand(&cobra.Command{
		Use:   "version",
		Short: "Print the OQM version",
		Args:  cobra.NoArgs,
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println(version)
		},
	})

	return cmd
}

func main() {
	if err := newRootCommand().Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
