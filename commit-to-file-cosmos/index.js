const gitHubApiRequest = require('../common/github-app');
const sanitizeJson = require('../common/sanitize-json');
const constants = require('../common/constants');
const config = require('../common/config');

module.exports = function (context, documents) {
  // Cosmos temporally batches document updates
  if (!!documents && documents.length > 0) {
    documents.forEach((document) => {
      // Look into possibly batching multiple document updates into a single commit...
      let sanitizedContent = sanitizeJson(
        req.body.data,
        config('FILTER_KEYS'),
        constants.SANITIZATION_OPTIONS
      );
      let requestConfig = {
        keyFilePath: config('KEY_FILE_PATH'),
        owner: config('GITHUB_OWNER'),
        repo: config('GITHUB_REPO'),
        userAgent: config('USER_AGENT'),
        fileName: `${document.id}.json`,
        filePath: `${config('PATH_PATTERN')}`,
        content: sanitizedContent,
        commitMessage: config('COMMIT_MESSAGE')
      };
      try {
        gitHubApiRequest(requestConfig, (response) => {});
      } catch(err) {
        // log to AI if keys/settings are provided...
        // continue processing other changes
      }
    });
  }
  context.done();
}