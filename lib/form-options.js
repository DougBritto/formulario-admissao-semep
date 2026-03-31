const fs = require('fs');
const path = require('path');

const OPTIONS_PATH = path.join(__dirname, '..', 'config', 'form-options.json');

function loadFormOptions() {
  return JSON.parse(fs.readFileSync(OPTIONS_PATH, 'utf8'));
}

module.exports = {
  loadFormOptions
};
