import { run } from './inline-theme-defaults';

run().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
