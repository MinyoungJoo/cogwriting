export interface TopicDef {
    id: string;
    title: string;
    description: string;
    prompt: string; // The actual text put into writingTopic
    audience: string; // Default audience
}

export const TOPICS: Record<'creative' | 'argumentative', TopicDef[]> = {
    creative: [
        {
            id: 'c_experience',
            title: 'Personal Experience',
            description: 'Write a movie scenario based on a recent personal experience.',
            prompt: '최근 인상 깊었던 경험은 무엇인가요? 1인칭 주인공 시점의 이야기를 적어보세요.',
            audience: 'General Audience / Movie Goers'
        },
        {
            id: 'c_past',
            title: 'If I could go back in time',
            description: 'Write a story about going back in time to a specific moment.',
            prompt: '과거의 순간으로 돌아갈 수 있다면 언제로 돌아가고 싶으신가요? 1인칭 주인공 시점의 이야기로 적어보세요.',
            audience: 'General Audience / Fiction Readers'
        },
        {
            id: 'c_superpower',
            title: 'What if I had a superpower?',
            description: 'Write a story about having a superpower for one day.',
            prompt: '하루 동안 내가 원하는 초능력을 가질 수 있다면, 어떤 능력을 갖고 싶으신가요? 1인칭 주인공 시점의 이야기로 적어보세요.',
            audience: 'General Audience'
        }
    ],
    argumentative: [
        {
            id: 'a_ai_essay',
            title: 'AI Essay: Innovation vs Destruction',
            description: 'Discuss if AI essay writing is innovation or destruction of creativity.',
            prompt: '인공지능이 에세이 작성을 도와주는 것이 개인적인 표현력을 키울 기회를 빼앗는다고 우려하는 사람들이 있습니다. 당신은 이 의견에 동의하십니까? 동의한다면 그 이유는 무엇이고, 동의하지 않는다면 그 이유는 무엇입니까?',
            audience: 'General Public'
        },
        {
            id: 'a_ai_art',
            title: 'AI Art: Innovation vs Destruction',
            description: 'Discuss if AI art is innovation or destruction of creativity.',
            prompt: '인공지능으로 생성된 그림을 예술이라고 생각하시나요? 또는 창작의 의미를 저해하는 부정행위라고 생각하시나요? 당신의 생각을 구체적인 이유와 예를 들어 설명해 주십시오.',
            audience: 'Academic Peers / Professors'
        },
        {
            id: 'a_techonology',
            title: 'Technology: Connection or Isolation?',
            description: 'Discuss if technology connects or isolates people.',
            prompt: '어떤 사람들은 기술이 사람들을 더욱 긴밀하게 연결해 준다고 합니다. 또 어떤 사람들은 기술이 진정한 사회적 교류를 방해하고, 우리를 더 외롭게 만든다고 말합니다. 당신의 생각을 구체적인 이유와 예를 들어 설명해 주십시오.',
            audience: 'General Public'
        }
    ]
};

export const getTopicById = (id: string): TopicDef | undefined => {
    const all = [...TOPICS.creative, ...TOPICS.argumentative];
    return all.find(t => t.id === id);
};
