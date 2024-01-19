import moment from "moment";
import shell from "shelljs";
import { promises as fs } from "fs";

import { generateMetrics } from "./generateMetrics.mjs";
import config from "./config.mjs";

const dayFormat = "YYYY/MM/DD";

let days = [];
const today = moment();

let currentDay = config.startingDate;
while (moment(currentDay, dayFormat).isBefore(today)) {
  days.push(currentDay);
  currentDay = moment(currentDay, dayFormat)
    .add(config.stepCount, config.stepType)
    .format(dayFormat);
}

days = days.reverse();

function checkout(date) {
  const commit = shell.exec(
    `git log --before="${date} 23:59" --format=%H | head -n 1`,
    {
      silent: true,
    }
  );

  shell.exec(`git checkout ${commit.stdout}`, { silent: true });

  return commit.trim();
}

(async () => {
  const currentDirector = shell.pwd().stdout;
  shell.cd(config.repository);
  shell.exec(`git checkout master`, { silent: true });
  const rows = [];

  for (const day of days) {
    shell.cd(config.repository);
    const commit = checkout(day);
    shell.cd(currentDirector);
    const metrics = await generateMetrics(config.repository);
    const row = { ...metrics, commit, day };
    rows.push(row);
  }
  // order rows by date asc
  rows.reverse();

  await fs.writeFile(`graph-app/public/metrics.json`, JSON.stringify(rows));
})();
