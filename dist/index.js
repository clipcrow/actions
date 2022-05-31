"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const handler_1 = require("./handler");
(0, handler_1.handleEvent)().catch(err => {
    core.setFailed(err);
});
