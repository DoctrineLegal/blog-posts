import minimist from "minimist";
import moment from "moment";

const argv = minimist(process.argv.slice(2));

if (!argv.repository) {
  throw new Error(
    `Missing --repository parameter: a path to a git repository is required`
  );
}

export default {
  repository: argv.repository,
  startingDate: argv.date || moment(),
  stepType: argv.stepType || "days",
  stepCount: argv.stepCount || 7,
};
