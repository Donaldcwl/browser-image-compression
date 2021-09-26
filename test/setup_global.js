const pkg = require('../package.json');

global.process.env.NODE_ENV = 'production';
global.process.env.BUILD = 'production';
global.__buildDate__ = () => JSON.stringify(new Date());
global.__buildVersion__ = JSON.stringify(pkg.version);
