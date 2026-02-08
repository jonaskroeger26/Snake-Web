const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'app', 'mwa-entry.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  outfile: path.join(__dirname, 'app', 'mwa-bundle.js'),
  minify: true,
  sourcemap: false,
  target: ['es2020'],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
}).then(() => {
  console.log('MWA bundle written to app/mwa-bundle.js');
}).catch((e) => {
  console.error('MWA build failed:', e);
  process.exit(1);
});
