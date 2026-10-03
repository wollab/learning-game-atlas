import {defineConfig} from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({site:'https://wollab.github.io',base:'/learning-game-atlas',trailingSlash:'always',integrations:[react()]});
