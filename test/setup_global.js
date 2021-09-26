const pkg = require('../package.json');

global.process.env.NODE_ENV = 'test';
global.process.env.BUILD = 'test';
global.__buildDate__ = () => JSON.stringify(new Date());
global.__buildVersion__ = JSON.stringify(pkg.version);
