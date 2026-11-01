import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
try { loadEnvFile(join(root, '.env')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
import {hostingConfig} from './hosting-config.mjs';
export const {hosted,previewOnly,chatEnabled,port,origin,redirect,dataDir,bindHost,expectedHost}=hostingConfig(process.env,root);
export const scopes = ['user:read:chat', 'user:write:chat'];
export const subscriptionScope = 'channel:read:subscriptions';
export const canvas = { width: dimension(process.env.CANVAS_WIDTH,1920), height: dimension(process.env.CANVAS_HEIGHT,1080) };
function dimension(x, fallback) { const n=Number(x); return Number.isInteger(n)&&n>=320&&n<=7680?n:fallback; }
