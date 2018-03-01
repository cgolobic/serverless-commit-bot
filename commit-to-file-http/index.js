const gitHubApiRequest = require('../common/github-app');
const sanitizeJson = require('../common/sanitize-json');
const constants = require('../common/constants');
const config = require('../common/config');

module.exports = function (context, req) {
  if (!!req.body.files && req.body.files.length > 0) {
    req.body.files.forEach((file) => {
      let sanitizedContent = sanitizeJson(
        file.content,
        config('FILTER_KEYS'),
        constants.SANITIZATION_OPTIONS
      );
      let requestConfig = {
        keyFilePath: config('KEY_FILE_PATH'),
        owner: req.params.owner,
        repo: req.params.repo,
        userAgent: config('USER_AGENT'),
        filePath: file.path,
        fileName: file.name,
        content: sanitizedContent,
        commitMessage: req.body.message
      };
      try {
        gitHubApiRequest(requestConfig, (response) => {});
      } catch (err) {
        // log to AI if keys/settings are provided...
        // continue processing other changes
      }
    });
    context.res = {
      status: 200,
      body: `${req.body.files.length} files updated`
    };
    context.done();
  }
}

function _returnError(context, message) {
  context.res = {
    status: 400,
    body: `Error: ${message}`
  };
  context.done();
}