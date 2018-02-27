const beautify = require('json-beautify');

module.exports = function(jsonObj, stripProperties, formattingOptions) {
  let filteredObj = Object.keys(jsonObj)
    .filter((key) => stripProperties.indexOf(key) === -1)
    .reduce((result, key) => (result[key] = jsonObj[key], result), {});
  if (formattingOptions) {
    return beautify(
      filteredObj,
      formattingOptions.replacer,
      formattingOptions.indentSize,
      formattingOptions.maxLineLength
    );
  }
  return JSON.stringify(filteredObj);
}