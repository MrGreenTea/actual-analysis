#!/usr/bin/env node

import { program, InvalidArgumentError } from "commander";

import api from "@actual-app/api";

const CATEGORY_EMOJI = {
  "🟠": "Want",
  "🔴": "Need",
  "🟢": "Want",
  "💰": "Save",
  // Hammer -> Work,
  "🔨": "Work",
};

const log = console.log;

async function main(month, { password }) {
  console.debug("Getting budget for month", month);
  await api.init({
    // Budget data will be cached locally here, in subdirectories for each file.
    dataDir: "./.data/",
    // This is the URL of your running server
    serverURL: "https://actual.jonasbulik.de",
    // This is the password you use to log into the server
    password,
  });

  const overCategorySums = new Map();

  try {
    // This is the ID from Settings → Show advanced settings → Sync ID
    await api.downloadBudget("9b1c7ec2-96df-4403-b792-d59281a49c74");

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
        const spent = category.spent || 0;
        if (spent !== 0) {
          overCategorySums.set(
            over_category,
            (overCategorySums.get(over_category) || 0) + spent
          );
        }
      }
    }
    // convert to percentages
    const total = overCategorySums.values().reduce((a, b) => a + b, 0);
    console.log();
    for (const [key, value] of overCategorySums) {
      const percent = (100 * value) / total;
      log(`${key}: ${percent.toFixed(2)}%`);
    }
    console.log();
  } finally {
    // Ensure the API client shuts down, even if an error occurred.
    await api.shutdown();
  }
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
  .argument("[month]", "Month to download", parseMonth, "current")
  .option("-p, --password <password>", "Password")
  .option("-v, --verbose", "Verbose logging")
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
