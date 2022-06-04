import * as core from '@actions/core';

import { handleEvent } from './workflow';

// bootstrap
handleEvent().catch(err => {
    core.setFailed(err);
});
