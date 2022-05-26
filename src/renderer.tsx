import { JSXSlack, Blocks, Section } from 'jsx-slack';

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

// プルリク情報ブロックの描画。作成者・番号・題名・リンク・状態（オープン、クローズ）・マージ（未、完）

// レビュワー情報ブロックの描画。レビュワー・承認（未、完）

// メタ情報＋イベント情報から作られたモデルを、Blockに描画する。
