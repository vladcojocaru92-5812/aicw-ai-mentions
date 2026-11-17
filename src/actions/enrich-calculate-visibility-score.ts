import { AGGREGATED_DIR_NAME } from '../config/constants.js';
import { logger } from '../utils/compact-logger.js';
import { waitForEnterInInteractiveMode, getModuleNameFromUrl } from '../utils/misc-utils.js';
import {
  getTargetDateFromProjectOrEnvironment,
  validateAndLoadProject,
  loadDataJs,
  saveDataJs,
  getLatestCompiledFile,
  getProjectNameFromCommandLine
} from '../utils/project-utils.js';
import { calculateVisibilityScore } from '../utils/visibility-score.js';
import { PipelineCriticalError } from '../utils/pipeline-errors.js';

const CURRENT_MODULE_NAME = getModuleNameFromUrl(import.meta.url);

/**
 * Compute the 0-100 visibility score for the project subject and merge it
 * into the aggregated compiled data as `score` (consumed by report-score).
 * Runs after the enrich steps; offline, no AI calls.
 */
async function main(): Promise<void> {
  const project = await getProjectNameFromCommandLine();
  const projectConfig = await validateAndLoadProject(project);
  if (!projectConfig) {
    throw new PipelineCriticalError(`Project "${project}" is not valid. Create it first or fix project.json.`, CURRENT_MODULE_NAME, project);
  }
  const targetDate = await getTargetDateFromProjectOrEnvironment(project);
  await logger.initialize(import.meta.url, project);

  const file = await getLatestCompiledFile(project, AGGREGATED_DIR_NAME, targetDate);
  if (!file) {
    logger.warn(`No aggregated compiled data for "${project}" (${targetDate}); visibility score skipped.`);
    await logger.showSummary();
    return;
  }

  const { data, dataKey } = await loadDataJs(file);
  const subjectName = projectConfig.display_name || projectConfig.name || project;
  const score = calculateVisibilityScore(data, subjectName);
  if (!score) {
    logger.warn('Compiled data has no brands/bots; visibility score skipped.');
    await logger.showSummary();
    return;
  }

  data.score = score;
  await saveDataJs(file, dataKey, data);
  logger.success(`Visibility score for "${score.subject}": ${score.overall}/100 (matched: ${score.matched})`);
  for (const c of score.breakdown) {
    logger.info(`  ${c.label}: ${c.value} (weight ${c.weight})`);
  }
  await logger.showSummary();
  await waitForEnterInInteractiveMode();
}

main().catch(err => {
  logger.error(err.message || err.toString());
  throw err;
});
