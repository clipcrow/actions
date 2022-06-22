import { DeployCompleteLog } from './logger.tsx';
import { closedModel } from './test.utils.ts';

Deno.test('DeployCompleteLog', () => {
    console.log(`{"blocks":${JSON.stringify(<DeployCompleteLog {...closedModel}/>)}}`);
});
