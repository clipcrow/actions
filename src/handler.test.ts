import { getRequestedReviewer } from './handler';

test('extractPayload', () => {
    const payload1 = {
        requested_reviewer: {
            login: 'someone',
            html_url: 'https://github.com/someone',
        }
    };
    const reviewer1 = getRequestedReviewer(payload1);
    expect(reviewer1.login).toEqual('someone');
    expect(reviewer1.url).toEqual('https://github.com/someone');

    const payload2 = {
        requested_team: {
            name: 'someteam',
            html_url: 'https://github.com/owner/someteam',
        }
    };
    const reviewer2 = getRequestedReviewer(payload2);
    expect(reviewer2.login).toEqual('someteam');
    expect(reviewer2.url).toEqual('https://github.com/owner/someteam');
});
