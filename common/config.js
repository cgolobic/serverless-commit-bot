const _config = {
  FILTER_KEYS: process.env['FILTER_KEYS'] || [],
  KEY_FILE_PATH: process.env['KEY_FILE_PATH'],
  GITHUB_OWNER: process.env['GITHUB_OWNER'],
  GITHUB_REPO: process.env['GITHUB_REPO'],
  USER_AGENT: process.env['USER_AGENT'] || 'serverless-commit-bot',
  PATH_PATTERN: process.env['PATH_PATTERN'] || '',
  COMMIT_MESSAGE: process.env['COMMIT_MESSAGE'] || 'Generic commit message'
}

module.exports = function(key) {
  let configValue = _config[key];
  if (!configValue) {
    throw Error(`App setting ${key} is required, but no value was provided`);
  }
  return configValue;
}