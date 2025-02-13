# Actual Budget CLI

A command-line interface tool for analyzing your [Actual Budget](https://actualbudget.com/) data according to the 50-30-20 budgeting rule. This tool helps categorize your expenses into three main categories: Needs (50%), Wants (30%), and Savings (20%).

## Prerequisites

- Node.js
- pnpm
- A running Actual Budget server
- Your budget's Sync ID (found in Settings → Show advanced settings → Sync ID)

## Installation

```bash
pnpm install
```

## Usage

```bash
node index.js [month] [options]
```

### Arguments

- `month` (optional): The month to analyze in YYYY-MM format. Defaults to the last month.

### Options

- `-p, --password <password>`: Your Actual server password
- `-b, --budget-id <id>`: Your budget's Sync ID
- `-s, --server-url <url>`: The URL of your Actual server
- `--budget`: Use budgeted amounts instead of actual spending
- `-h, --help`: Display help information
- `-V, --version`: Display version information

### Category Marking

The tool recognizes categories based on emoji markers in your category names:

- 🔴 - Needs (Essential expenses)
- 🟠 or 🟢 - Wants (Non-essential expenses)
- 💰 - Savings
- 🔨 - Work-related expenses (excluded from the 50-30-20 calculation)

### Example

```bash
node index.js -p your-password -b your-budget-id -s http://your-server-url
```

This will display a table showing:

- The amount spent/budgeted in each category
- The percentage distribution across Needs, Wants, and Savings
- How your spending compares to the ideal 50-30-20 rule

## License

MIT License - See LICENSE file for details
