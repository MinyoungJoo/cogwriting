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
            id: 'c_movie_scenario',
            title: 'Movie Scenario (Personal Experience)',
            description: 'Write a movie scenario based on a recent personal experience.',
            prompt: '최근 인상 깊었던 실제 경험을 하나 떠올려서 1인칭 주인공 시점의 영화 시나리오 쓰기',
            audience: 'General Audience / Movie Goers'
        },
        {
            id: 'c_superpower',
            title: 'What if I had a superpower?',
            description: 'Write a story about having a superpower for one day.',
            prompt: '하루 동안 투명인간이 된다면 무엇을 할지 소설로 쓰기',
            audience: 'General Audience / Fiction Readers'
        },
        {
            id: 'c_old_photo',
            title: 'The Old Photograph',
            description: 'Write a story inspired by an old photograph found by chance.',
            prompt: '우연히 발견한 낡은 사진 한 장을 소재로 짧은 이야기 만들기',
            audience: 'General Audience'
        }
    ],
    argumentative: [
        {
            id: 'a_no_kids',
            title: 'No-Kids Zones',
            description: 'Are No-Kids Zones a legitimate right of business owners or discrimination?',
            prompt: '노키즈존(No-Kids Zone)은 업주의 정당한 권리인가, 아동에 대한 차별인가? 에 대한 본인의 의견을 논설문으로 작성하기',
            audience: 'General Public'
        },
        {
            id: 'a_ai_art',
            title: 'AI Art: Innovation vs Destruction',
            description: 'Discuss if AI art is innovation or destruction of creativity.',
            prompt: 'AI 생성 이미지 콘텐츠는 예술의 진입 장벽을 낮추는 혁신인가, 창작의 의미를 붕괴시키는가? 를 주제에 대해 의견과 근거를 적기.',
            audience: 'Academic Peers / Professors'
        },
        {
            id: 'a_zoos',
            title: 'Ethics of Zoos',
            description: 'Are zoos necessary for conservation or are they animal prisons?',
            prompt: '동물원은 멸종 위기 동물을 보호하는 곳인가, 동물을 학대하는 감옥인가? 에 대해 논설문 작성하기',
            audience: 'General Public'
        }
    ]
};

export const getTopicById = (id: string): TopicDef | undefined => {
    const all = [...TOPICS.creative, ...TOPICS.argumentative];
    return all.find(t => t.id === id);
};
