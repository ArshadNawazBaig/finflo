const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve react and react-native to the local node_modules
// This prevents "Invalid hook call" errors when multiple versions exist in a monorepo
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  '@react-native': path.resolve(projectRoot, 'node_modules/@react-native'),
};

// 4. Block other copies of react and react-native to avoid duplicates
// Using the private export path since the internal source is not directly exported
const exclusionList = require('metro-config/private/defaults/exclusionList');
config.resolver.blockList = exclusionList([
  new RegExp(path.resolve(workspaceRoot, 'node_modules/react/.*')),
  new RegExp(path.resolve(workspaceRoot, 'node_modules/react-native/.*')),
]);

module.exports = config;
