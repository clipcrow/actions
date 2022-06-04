"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const workflow_1 = require("./workflow");
// bootstrap
(0, workflow_1.handleEvent)().catch(err => {
    core.setFailed(err);
});
//# sourceMappingURL=index.js.map