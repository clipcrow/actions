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
