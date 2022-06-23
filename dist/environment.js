"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActionContext = exports.getWebClient = exports.getGraphQL = exports.getEnv = void 0;
const core = require("@actions/core");
const dotenv = require("dotenv");
const graphql_1 = require("@octokit/graphql");
const web_api_1 = require("@slack/web-api");
const env = dotenv.config();
function getEnv(name) {
    const value = core.getInput(name);
    return value || (env.parsed ? env.parsed[name] : '');
}
exports.getEnv = getEnv;
function getGraphQL() {
    return graphql_1.graphql.defaults({
        headers: {
            authorization: `token ${getEnv('githubToken')}`,
        },
    });
}
exports.getGraphQL = getGraphQL;
function getWebClient() {
    return new web_api_1.WebClient(getEnv('slackToken'));
}
exports.getWebClient = getWebClient;
function createActionContext(owner, name) {
    const githubToken = getEnv('githubToken');
    const slackToken = getEnv('slackToken');
    const slackChannel = getEnv('slackChannel');
    const emptyBodyWarning = getEnv('emptyBodyWarning');
    const pushMessage = getEnv('pushMessage');
    const slackAccounts = JSON.parse(getEnv('slackAccounts'));
    return {
        owner,
        name,
        githubToken,
        slackToken,
        slackChannel,
        slackAccounts,
        emptyBodyWarning,
        pushMessage,
    };
}
exports.createActionContext = createActionContext;
//# sourceMappingURL=environment.js.map