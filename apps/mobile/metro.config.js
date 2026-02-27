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

// 4. Block the root node_modules copies of react/react-native to avoid duplicates
config.resolver.blockList = [
  new RegExp(
    path.resolve(workspaceRoot, 'node_modules/react/.*').replace(/\\/g, '/'),
  ),
  new RegExp(
    path
      .resolve(workspaceRoot, 'node_modules/react-native/.*')
      .replace(/\\/g, '/'),
  ),
];

module.exports = config;
