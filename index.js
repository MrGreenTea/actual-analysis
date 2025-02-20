#!/usr/bin/env node

import { program, InvalidArgumentError } from "commander";
import yoctoSpinner from "yocto-spinner";
import api from "@actual-app/api";
import Table from "cli-table3";
import chalk from "chalk";

const CATEGORY_EMOJI = {
  "🟠": "Want",
  "🔴": "Need",
  "🟢": "Want",
  "💰": "Save",
  "🔨": "Work",
};

const log = console.log;

async function main(
  month,
  { password, budget: useBudgetedAmounts, budgetId, serverUrl: serverURL }
) {
  console.debug("Getting budget for month", month);
  const spinner = yoctoSpinner({ text: "Loading data" }).start();
  await api.init({
    // Budget data will be cached locally here, in subdirectories for each file.
    dataDir: "./.data/",
    // This is the URL of your running server
    serverURL,
    // This is the password you use to log into the server
    password,
  });

  const overCategorySums = {
    Want: 0,
    Need: 0,
    Save: 0,
    Work: 0,
    NONE: 0,
  };

  function getAmount(category) {
    if (useBudgetedAmounts) {
      return category.budgeted || 0;
    } else {
      return category.spent || 0;
    }
  }

  try {
    // This is the ID from Settings → Show advanced settings → Sync ID
    await api.downloadBudget(budgetId);

    let budget = await api.getBudgetMonth(month);
    for (const group of budget.categoryGroups) {
      for (const category of group.categories) {
        const over_categories = [];
        for (const [emoji, name] of Object.entries(CATEGORY_EMOJI)) {
          if (category.name.includes(emoji)) {
            over_categories.push(name);
          }
        }
        let over_category = over_categories[0];
        if (over_categories.length > 1) {
          console.error(
            "IGNORING",
            category.name,
            "belongs to multiple categories: ",
            over_categories
          );
          continue;
        } else if (over_categories.length === 0) {
          over_category = "NONE";
        }
        const amount = getAmount(category);
        if (amount !== 0) {
          overCategorySums[over_category] += amount;
        }
      }
    }

    delete overCategorySums.NONE;
    delete overCategorySums.Work;
    // convert to percentages
    const total = Object.values(overCategorySums).reduce((a, b) => a + b, 0);
    spinner.success("Loaded data\n");
    console.log();
    const table = new Table({
      head: ["Category", "Amount", "Percentage"],
      colWidths: [36, 12, 12],
      colAligns: ["left", "right", "right"],
    });
    // this makes sure we notice if they are off due to some bug in the future
    const percents = [];
    for (const [key, value] of Object.entries(overCategorySums)) {
      const percent = (100 * value) / total;
      percents.push(percent);

      // value is in cents and we convert it to euros
      table.push([
        chalk.bold(key),
        `${(Math.abs(value) / 100).toFixed(2)} €`,
        `${percent.toFixed(2)} %`,
      ]);
    }
    table.push([
      chalk.bold("Total"),
      `${(Math.abs(total) / 100).toFixed(2)} €`,
      `${percents.reduce((a, b) => a + b, 0).toFixed(2)} %`,
    ]);
    log(table.toString());
  } finally {
    await api.shutdown();
    // in case of an error also stop the spinner
    if (spinner.isSpinning) {
      spinner.stop();
    }
  }
}

function defaultMonth() {
  return parseMonth("last");
}

/// @param {string} str
/// @return {string} in the format expected by `getBudgetMonth`: YYYY-MM
function parseMonth(str) {
  if (str == null || str == "last") {
    // month before
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
  }
  if (str == "current") {
    // current month
    return new Date().toISOString().slice(0, 7);
  }
  // make sure it's in the format expected by `getBudgetMonth`: YYYY-MM
  if (!str.match(/^\d{4}-\d{2}$/)) {
    throw new InvalidArgumentError(
      "Invalid month. Must be in the format YYYY-MM."
    );
  }
  return str;
}

program
  .version("0.1.0")
  .description("Actual CLI")
  .argument("[month]", "Month to download", parseMonth, defaultMonth())
  .option("-p, --password <password>", "Password")
  .option("-i, --budget-id <id>", "Budget ID")
  .option("-s, --server-url <url>", "Server URL")
  .option("-v, --verbose", "Verbose logging")
  .option("-b, --budget", "use budgeted amounts instead of spent", false)
  .action(async (month, options) => {
    if (!options.verbose) {
      console.debug = () => {};
      console.log = () => {};
    }
    await main(month, options).finally(() => {
      console.debug = log;
      console.log = log;
    });
  });

program.parse(process.argv);
