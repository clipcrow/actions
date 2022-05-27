import { Blocks, Section, Field, Header } from 'jsx-slack';
import type { Profile, ActionEvent } from './types';

export const UserLink = (props: Profile) => (
	<a href={'@' + props.slack} /> 
);

export const HeadlineInfo = (props: ActionEvent) => {

	return (
		<Section>
			<UserLink {...props.pull_request.user} /> wants to merge {props.pull_request.commits} commits into <code>
				{props.pull_request.base.ref}</code> from <code>{props.pull_request.head.ref}</code>
		</Section>
	);
}
export const StatuDisplay = (props: { text: string, chack: boolean }) => (
	<Section>{ props.chack ? ':large_green_circle:' : ':red_circle:' }<b>{props.text}</b></Section>
);

export const PullRequestInfo = (props: ActionEvent) => (
	<Blocks>
		<HeadlineInfo {...props} />
		<Header>{props.pull_request.title}</Header>
		<Section>
			<Field><b>Pull Request:</b> <a href={props.pull_request.html_url}>#{props.pull_request.number}</a></Field>
			<Field><b>Status:</b> {props.pull_request.state}</Field>
		</Section>
		<Section>{props.pull_request.body}</Section>
	</Blocks>
);

export const ActivityLog = (props: ActionEvent) => (
    //   追加ログ情報。PRのクローズ・再開、レビュワーの追加・削除、レビュー承認・却下についてBlock描画する。
    <p></p>
);
