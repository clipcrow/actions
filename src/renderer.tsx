import { JSXSlack, Blocks, Section } from 'jsx-slack';
import { JSX } from 'jsx-slack/jsx-runtime';

const Reviewer = () => (
    <Blocks>
        <Section>
            <p>Hello, World</p>
        </Section>
    </Blocks>
);

export function renderMessage () {
    // PoC
    console.log(JSXSlack(<Reviewer></Reviewer>));
}

// - プルリク情報ブロックの描画。作成者・番号・題名・リンク・状態（オープン、クローズ）・マージ（未、完）
//   レビュワー情報ブロックの描画。レビュワー・承認（未、完）

export function renderPullRequestInfoBlock(): JSX.Element {
    // メタ情報＋イベント情報から作られたモデルを、Block描画する。
    return <p></p>;
}

export function renderActivityLogBlock(): JSX.Element {
    //   追加ログ情報。PRのクローズ・再開、レビュワーの追加・削除、レビュー承認・却下についてBlock描画する。
    return <p></p>;
}

const blockSample = {
	"blocks": [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "<@Tam> wants to merge 8 commits into `develop` from `feature/ci-child-269-api-get-tags-of-group`"
			}
		},
		{
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": "api get tags of group"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": `Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                        Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,
                        when an unknown printer took a galley of type and scrambled it to make a type specimen book.`
			}
		},
		{
			"type": "section",
			"fields": [
				{
					"type": "mrkdwn",
					"text": "*Pull Request:* #987"
				},
				{
					"type": "mrkdwn",
					"text": "*Status:* Open"
				}
			]
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "*URL:* https://github.com/clipcrow/essentialworkware/pull/987"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":red_circle: *Review requested*"
			}
		},
		{
			"type": "context",
			"elements": [
				{
					"type": "mrkdwn",
					"text": "> 2 pending reviewer"
				},
				{
					"type": "mrkdwn",
					"text": "<@m>"
				},
				{
					"type": "mrkdwn",
					"text": "<@Aida>"
				}
			]
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":large_green_circle: *All checks have passed*"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":large_green_circle: *This branch has no conflicts*"
			}
		}
	]
};
