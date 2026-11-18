import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "analysis", "output");
const destination = path.join(root, "rr-pressure-dashboard", "data.js");

function parseCsv(fileName) {
  const [header, ...rows] = fs
    .readFileSync(path.join(outputDir, fileName), "utf8")
    .trim()
    .split(/\r?\n/);
  const keys = header.split(",");
  return rows.map((line) => {
    const values = line.split(",");
    const entry = Object.fromEntries(keys.map((key, index) => [key, values[index]]));
    for (const key of [
      "rank",
      "pressure_reliability_score",
      "pressure_balls",
      "pressure_matches",
      "pressure_balls_ipl",
      "pressure_balls_t20i",
      "effective_pressure_balls",
      "high_pressure_value_per_100",
      "usual_value_per_100",
      "pressure_lift_per_100",
      "lower_confidence_bound",
      "positive_pressure_match_rate",
      "standard_error_per_100",
    ]) {
      entry[key] = Number(entry[key]);
    }
    entry.display_name = entry.player_name === "Namboori Tilak Varma" ? "Tilak Varma" : entry.player_name;
    return entry;
  });
}

const payload = {
  metadata: JSON.parse(fs.readFileSync(path.join(outputDir, "pressure_model_metadata.json"), "utf8")),
  batters: parseCsv("pressure_rankings_batters.csv"),
  bowlers: parseCsv("pressure_rankings_bowlers.csv"),
};

fs.writeFileSync(
  destination,
  `/* Generated from the supplied ball-by-ball model outputs. */\nwindow.PRESSURE_DATA = ${JSON.stringify(payload, null, 2)};\n`,
);

console.log(destination);
