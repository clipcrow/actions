import { getRequestedReviewer } from './handler.ts';
import { assertEquals } from 'https://deno.land/std@0.144.0/testing/asserts.ts';

Deno.test('extractPayload', () => {
    const payload1 = {
        requested_reviewer: {
            login: 'someone',
            html_url: 'https://github.com/someone',
        },
    };
    const reviewer1 = getRequestedReviewer(payload1);
    assertEquals(reviewer1.login, 'someone');
    assertEquals(reviewer1.url, 'https://github.com/someone');

    const payload2 = {
        requested_team: {
            name: 'someteam',
            html_url: 'https://github.com/owner/someteam',
        },
    };
    const reviewer2 = getRequestedReviewer(payload2);
    assertEquals(reviewer2.login, 'someteam');
    assertEquals(reviewer2.url, 'https://github.com/owner/someteam');
});
