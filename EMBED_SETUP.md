# SDR Console - Quick Setup

One command to install the Telegram automation on your Mac.

## Prerequisites

- Mac computer (macOS 10.14+)
- Telegram Desktop installed and logged in
- Credentials from your manager:
  - EMPLOYEE_ID (your username)
  - RELAYER_API_KEY
  - ANTHROPIC_API_KEY

## Install

Open Terminal and paste:

```bash
curl -fsSL https://sdr-console-production.up.railway.app/install.sh | bash
```

The installer will:
1. Check for Node.js (installs if missing)
2. Download the relayer package
3. Prompt for your credentials
4. Open System Settings for permissions
5. Start the relayer

## Mac Permission

When System Settings opens, grant Accessibility permission:

1. Click the lock to unlock
2. Click + and add **Terminal**
3. Enable the checkbox

This allows the automation to paste and send messages in Telegram.

## Start Relayer (after first setup)

```bash
cd ~/sdr-relayer && npm run relayer
```

Keep this running while sending messages.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Telegram opens but nothing sends | Grant Accessibility permission (see above) |
| "Cannot reach server" | Check internet, verify server URL |
| "Unauthorized" | Check RELAYER_API_KEY matches |
| No drafts processing | Check EMPLOYEE_ID matches your username |

## More Help

- Full guide: [SDR_ONBOARDING.md](SDR_ONBOARDING.md)
- Relayer details: [RELAYER_README.md](RELAYER_README.md)
- Web UI: https://sdr-console-production.up.railway.app
