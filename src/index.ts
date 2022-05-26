import * as core from '@actions/core';
import { handleEvent } from './handler';

handleEvent().catch(err => {
    core.setFailed(err);
});
