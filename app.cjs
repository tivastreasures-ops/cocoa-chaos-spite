// CommonJS entry point for cPanel/Passenger. Existing app remains ES modules.
import('./src/server.mjs').catch(()=>{
  console.error('Companion startup failed. Check Node version, HTTPS origin, hosted credentials and persistent data path.');
  process.exitCode=1;
});
