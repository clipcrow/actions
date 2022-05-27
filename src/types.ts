interface Accounts {
    [github: string]: string;
}

interface ActionContext {
    token: string;
    channel: string;
    accounts: Accounts;
}

export type { ActionContext };
