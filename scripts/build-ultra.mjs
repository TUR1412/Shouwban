import { build } from 'vite';

import viteConfig from '../vite.config.mjs';
import { compressDist } from './compress-dist.mjs';
import { postbuildCopyStatic } from './postbuild-copy.mjs';

await build(viteConfig);
postbuildCopyStatic();
await compressDist();
