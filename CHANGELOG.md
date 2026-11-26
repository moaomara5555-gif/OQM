# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Removed
- Removed Telegram and Bale notification delivery, setup, and LuCI controls. Legacy messaging fields in existing configuration and user records are ignored and are not serialized by the API.
- The backend's HTTP API remains required for the native LuCI interface.
