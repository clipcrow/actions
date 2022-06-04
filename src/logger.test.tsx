import { DeployCompleteLog } from './logger';
import { closedModel } from './test.utils';

test('DeployCompleteLog', () => {
    console.log(`{"blocks":${JSON.stringify(<DeployCompleteLog {...closedModel}/>)}}`);
});
