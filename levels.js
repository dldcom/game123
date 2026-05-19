// 저장소 관리 (LocalStorage)
const StorageManager = {
    KEY: 'pipe_shifter_data',
    
    _getData: function() {
        try {
            const data = localStorage.getItem(this.KEY);
            if (data) return JSON.parse(data);
        } catch (e) {}
        
        // 하위 호환성
        const oldData = localStorage.getItem('pipe_shifter_progress');
        let unlocked = oldData ? parseInt(oldData) : 0;
        return { unlocked: unlocked, stars: {} };
    },
    
    _saveData: function(data) {
        localStorage.setItem(this.KEY, JSON.stringify(data));
    },

    getUnlockedStage: function() {
        return this._getData().unlocked;
    },
    
    unlockStage: function(stageIndex) {
        const data = this._getData();
        if (stageIndex > data.unlocked) {
            data.unlocked = stageIndex;
            this._saveData(data);
        }
    },
    
    getStars: function(stageIndex) {
        const data = this._getData();
        return data.stars[stageIndex] || 0;
    },
    
    saveStars: function(stageIndex, stars) {
        const data = this._getData();
        const currentStars = data.stars[stageIndex] || 0;
        if (stars > currentStars) {
            data.stars[stageIndex] = stars;
            this._saveData(data);
        }
    },
    
    clearProgress: function() {
        localStorage.removeItem(this.KEY);
        localStorage.removeItem('pipe_shifter_progress');
    }
};

// SVG 에셋 (모양별)
const pipeSVGs = {
    'I': '<svg viewBox="0 0 100 100"><path d="M50,0 L50,100" /></svg>',
    'L': '<svg viewBox="0 0 100 100"><path d="M50,0 L50,50 L100,50" /></svg>',
    'T': '<svg viewBox="0 0 100 100"><path d="M0,50 L100,50 M50,50 L50,100" /></svg>',
    'CROSS': '<svg viewBox="0 0 100 100"><path d="M0,50 L100,50 M50,0 L50,100" /></svg>',
    'ASYM': '<svg viewBox="0 0 100 100"><path d="M50,0 L50,50 L100,50" /><circle cx="100" cy="50" r="10" fill="currentColor" stroke="none"/></svg>',
    'ONE_WAY': '<svg viewBox="0 0 100 100"><path d="M50,50 L50,100" /><circle cx="50" cy="50" r="12" fill="currentColor" stroke="none"/></svg>'
};

// 파이프 맵핑 데이터
const pipeBaseOpenings = {
    'I': [0, 2],
    'L': [0, 1],
    'T': [1, 2, 3],
    'CROSS': [0, 1, 2, 3],
    'ASYM': [0, 1],
    'ONE_WAY': [2]
};

// 스테이지 데이터 (각 파이프에 정답 상태인 answer 속성 추가)
const stages = [
    {
        // Stage 1: 밀기(Slide) 튜토리얼 (가로줄 맞추기)
        cols: 5, rows: 5,
        optimalMoves: 3,
        pipes: [
            { id: 'start', type: 'ONE_WAY', x: 0, y: 2, rot: 3, isFixed: true, start: true },
            { id: 'end', type: 'ONE_WAY', x: 4, y: 2, rot: 1, isFixed: true, target: true },
            
            { id: 'p1', type: 'I', x: 1, y: 0, rot: 1, isFixed: false, answer: { x: 1, y: 2, rot: 1 } },
            { id: 'p2', type: 'I', x: 2, y: 4, rot: 1, isFixed: false, answer: { x: 2, y: 2, rot: 1 } },
            { id: 'p3', type: 'I', x: 3, y: 1, rot: 1, isFixed: false, answer: { x: 3, y: 2, rot: 1 } }
        ]
    },
    {
        // Stage 2: 돌리기(Rotate) 튜토리얼 (제자리에 있지만 방향이 틀림)
        cols: 5, rows: 5,
        optimalMoves: 7,
        pipes: [
            { id: 'start', type: 'ONE_WAY', x: 0, y: 0, rot: 3, isFixed: true, start: true }, // 오른쪽 열림
            { id: 'end', type: 'ONE_WAY', x: 4, y: 4, rot: 2, isFixed: true, target: true }, // 위쪽 열림
            
            { id: 'p1', type: 'I', x: 1, y: 0, rot: 0, isFixed: false, answer: { x: 1, y: 0, rot: 1 } }, 
            { id: 'p2', type: 'L', x: 2, y: 0, rot: 0, isFixed: false, answer: { x: 2, y: 0, rot: 2 } }, 
            { id: 'p3', type: 'I', x: 2, y: 1, rot: 1, isFixed: false, answer: { x: 2, y: 1, rot: 0 } }, 
            { id: 'p4', type: 'L', x: 2, y: 2, rot: 1, isFixed: false, answer: { x: 2, y: 2, rot: 0 } }, 
            { id: 'p5', type: 'I', x: 3, y: 2, rot: 0, isFixed: false, answer: { x: 3, y: 2, rot: 1 } }, 
            { id: 'p6', type: 'L', x: 4, y: 2, rot: 3, isFixed: false, answer: { x: 4, y: 2, rot: 2 } }, 
            { id: 'p7', type: 'I', x: 4, y: 3, rot: 1, isFixed: false, answer: { x: 4, y: 3, rot: 0 } }, 
        ]
    },
    {
        // Stage 3: 종합 (밀고 돌리기) - 5개 파이프 필수 활용
        cols: 5, rows: 5,
        optimalMoves: 16,
        pipes: [
            { id: 'start', type: 'ONE_WAY', x: 0, y: 3, rot: 3, isFixed: true, start: true }, // 오른쪽 열림
            { id: 'end', type: 'ONE_WAY', x: 4, y: 1, rot: 1, isFixed: true, target: true }, // 왼쪽 열림
            
            { id: 'p1', type: 'I', x: 0, y: 2, rot: 0, isFixed: false, answer: { x: 1, y: 3, rot: 1 } }, 
            { id: 'p2', type: 'L', x: 1, y: 4, rot: 1, isFixed: false, answer: { x: 2, y: 3, rot: 3 } }, 
            { id: 'p3', type: 'L', x: 2, y: 1, rot: 2, isFixed: false, answer: { x: 2, y: 2, rot: 1 } }, 
            { id: 'p4', type: 'L', x: 3, y: 4, rot: 0, isFixed: false, answer: { x: 3, y: 2, rot: 3 } }, 
            { id: 'p5', type: 'L', x: 4, y: 2, rot: 2, isFixed: false, answer: { x: 3, y: 1, rot: 1 } }, 
        ]
    },
    {
        // Stage 4: 고정 파이프 테마 (장애물과 방향 맞추기)
        // 맵 중간에 부식되어 움직일 수 없는(isFixed: true) 파이프가 존재합니다.
        cols: 5, rows: 5,
        optimalMoves: 10,
        pipes: [
            { id: 'start', type: 'ONE_WAY', x: 0, y: 0, rot: 3, isFixed: true, start: true }, // 오른쪽 열림
            { id: 'end', type: 'ONE_WAY', x: 4, y: 4, rot: 1, isFixed: true, target: true },  // 왼쪽 열림
            
            // 맵 중앙에 고정된 장애물 파이프 (수평 방향으로만 통과 가능)
            { id: 'fixed1', type: 'I', x: 2, y: 2, rot: 1, isFixed: true }, 

            // 플레이어 조작 파이프 (초기 위치는 흩어져 있음)
            { id: 'p1', type: 'L', x: 0, y: 4, rot: 0, isFixed: false, answer: { x: 1, y: 0, rot: 2 } },
            { id: 'p2', type: 'I', x: 1, y: 3, rot: 1, isFixed: false, answer: { x: 1, y: 1, rot: 0 } },
            { id: 'p3', type: 'L', x: 2, y: 0, rot: 3, isFixed: false, answer: { x: 1, y: 2, rot: 0 } },
            { id: 'p4', type: 'L', x: 4, y: 0, rot: 1, isFixed: false, answer: { x: 3, y: 2, rot: 2 } },
            { id: 'p5', type: 'I', x: 4, y: 1, rot: 1, isFixed: false, answer: { x: 3, y: 3, rot: 0 } },
            { id: 'p6', type: 'L', x: 0, y: 3, rot: 2, isFixed: false, answer: { x: 3, y: 4, rot: 0 } }
        ]
    },
    {
        // Stage 5: 복합 복잡 미로 (6x6 격자 확장 및 '뒤집기' 기믹 본격 도입)
        // ASYM(비대칭) 파이프를 통해 flipX(좌우 대칭)가 반드시 필요하도록 설계되었습니다.
        cols: 6, rows: 6,
        optimalMoves: 16,
        pipes: [
            { id: 'start', type: 'ONE_WAY', x: 0, y: 0, rot: 3, isFixed: true, start: true }, 
            { id: 'end', type: 'ONE_WAY', x: 4, y: 5, rot: 1, isFixed: true, target: true },
            
            { id: 'p1', type: 'T', x: 5, y: 0, rot: 0, isFixed: false, answer: { x: 1, y: 0, rot: 2 } },
            { id: 'p2', type: 'ASYM', x: 4, y: 1, rot: 1, isFixed: false, answer: { x: 2, y: 0, rot: 2 } },
            { id: 'p3', type: 'I', x: 5, y: 2, rot: 1, isFixed: false, answer: { x: 2, y: 1, rot: 0 } },
            // [핵심] ASYM 파이프를 좌우로 뒤집어(flipX: -1) 입출구 방향을 [0, 3]으로 비틀어야 함
            { id: 'p4', type: 'ASYM', x: 3, y: 3, rot: 0, isFixed: false, answer: { x: 2, y: 2, rot: 0, flipX: -1 } }, 
            { id: 'p5', type: 'T', x: 5, y: 4, rot: 1, isFixed: false, answer: { x: 1, y: 2, rot: 0 } },
            { id: 'p6', type: 'L', x: 4, y: 3, rot: 2, isFixed: false, answer: { x: 0, y: 2, rot: 1 } },
            { id: 'p7', type: 'I', x: 0, y: 5, rot: 1, isFixed: false, answer: { x: 0, y: 3, rot: 0 } },
            { id: 'p8', type: 'L', x: 1, y: 5, rot: 3, isFixed: false, answer: { x: 0, y: 4, rot: 0 } },
            { id: 'p9', type: 'I', x: 2, y: 5, rot: 0, isFixed: false, answer: { x: 1, y: 4, rot: 1 } },
            { id: 'p10', type: 'CROSS', x: 5, y: 5, rot: 0, isFixed: false, answer: { x: 2, y: 4, rot: 0 } },
            { id: 'p11', type: 'L', x: 3, y: 0, rot: 2, isFixed: false, answer: { x: 2, y: 5, rot: 0 } },
            { id: 'p12', type: 'I', x: 3, y: 1, rot: 0, isFixed: false, answer: { x: 3, y: 5, rot: 1 } }
        ]
    },
    {
        // Stage 6: 브레인 티저 (상하 뒤집기 필수, 함정 없음)
        // 꼬여있는 6칸의 경로를 채워야 하며 주어지는 6개의 파이프를 남김없이 활용해야 합니다.
        cols: 5, rows: 5,
        optimalMoves: 18,
        pipes: [
            { id: 'start', type: 'ONE_WAY', x: 0, y: 1, rot: 3, isFixed: true, start: true },
            { id: 'end', type: 'ONE_WAY', x: 4, y: 4, rot: 1, isFixed: true, target: true },

            { id: 'p1', type: 'L', x: 0, y: 0, rot: 0, isFixed: false, answer: { x: 1, y: 1, rot: 2 } },
            { id: 'p2', type: 'I', x: 2, y: 0, rot: 1, isFixed: false, answer: { x: 1, y: 2, rot: 0 } },
            { id: 'p3', type: 'L', x: 4, y: 0, rot: 3, isFixed: false, answer: { x: 1, y: 3, rot: 0 } },
            // [핵심] ASYM 파이프를 상하로 뒤집고(flipY: -1) 회전시켜 [3, 2] (왼쪽, 아래) 연결구를 만들어야 함
            { id: 'p4', type: 'ASYM', x: 4, y: 2, rot: 0, isFixed: false, answer: { x: 2, y: 3, rot: 1, flipY: -1 } },
            { id: 'p5', type: 'L', x: 0, y: 3, rot: 1, isFixed: false, answer: { x: 2, y: 4, rot: 0 } },
            { id: 'p6', type: 'I', x: 0, y: 4, rot: 0, isFixed: false, answer: { x: 3, y: 4, rot: 1 } }
        ]
    },
    {
        // Stage 7: "지그재그 협곡" (6x6)
        // 평행이동(밀기)의 동선을 길게 가져가면서, 회전 방향을 헷갈리게 만드는 중급 스테이지
        cols: 6, rows: 6,
        optimalMoves: 18,
        pipes: [
            { id: 'start', type: 'ONE_WAY', x: 0, y: 0, rot: 3, isFixed: true, start: true }, // 오른쪽 열림
            { id: 'end', type: 'ONE_WAY', x: 5, y: 5, rot: 2, isFixed: true, target: true },  // 위에서 들어와야 함
            
            // 초기 배치는 맵 가장자리에 흩뿌려둠 (정답과 방향도 모두 틀리게 설정)
            { id: 'p1', type: 'L', x: 0, y: 1, rot: 0, isFixed: false, answer: { x: 1, y: 0, rot: 2 } },
            { id: 'p2', type: 'L', x: 0, y: 2, rot: 3, isFixed: false, answer: { x: 1, y: 1, rot: 0 } },
            { id: 'p3', type: 'I', x: 0, y: 3, rot: 0, isFixed: false, answer: { x: 2, y: 1, rot: 1 } },
            { id: 'p4', type: 'L', x: 0, y: 4, rot: 1, isFixed: false, answer: { x: 3, y: 1, rot: 2 } },
            { id: 'p5', type: 'I', x: 0, y: 5, rot: 1, isFixed: false, answer: { x: 3, y: 2, rot: 0 } },
            { id: 'p6', type: 'L', x: 1, y: 5, rot: 0, isFixed: false, answer: { x: 3, y: 3, rot: 0 } },
            { id: 'p7', type: 'I', x: 2, y: 5, rot: 0, isFixed: false, answer: { x: 4, y: 3, rot: 1 } },
            { id: 'p8', type: 'L', x: 3, y: 5, rot: 3, isFixed: false, answer: { x: 5, y: 3, rot: 2 } },
            { id: 'p9', type: 'I', x: 4, y: 5, rot: 1, isFixed: false, answer: { x: 5, y: 4, rot: 0 } }
        ]
    },
    {
        // Stage 8: "통곡의 벽" (6x6)
        // 화면을 가로지르는 거대한 고정 기둥을 통해 반대편으로 건너가야 합니다. 꼼수는 통하지 않습니다.
        cols: 6, rows: 6,
        optimalMoves: 24,
        pipes: [
            { id: 'start', type: 'ONE_WAY', x: 0, y: 2, rot: 3, isFixed: true, start: true },
            { id: 'end', type: 'ONE_WAY', x: 5, y: 5, rot: 1, isFixed: true, target: true },
            
            // 통곡의 벽 (기둥) 및 밑구멍 우회 차단
            { id: 'fixed1', type: 'I', x: 2, y: 1, rot: 0, isFixed: true }, 
            { id: 'fixed2', type: 'I', x: 2, y: 2, rot: 0, isFixed: true }, 
            { id: 'fixed3', type: 'I', x: 2, y: 3, rot: 0, isFixed: true }, 
            { id: 'fixed4', type: 'I', x: 2, y: 4, rot: 0, isFixed: true }, 
            { id: 'fixed5', type: 'I', x: 1, y: 4, rot: 1, isFixed: true }, // 가로로 두어 아래쪽 우회를 원천 차단
            
            // 플레이어 조작 파이프 (7개를 모두 남김없이 사용해야 함)
            { id: 'p1', type: 'I', x: 0, y: 0, rot: 1, isFixed: false, answer: { x: 1, y: 1, rot: 0 } },
            { id: 'p2', type: 'I', x: 3, y: 0, rot: 0, isFixed: false, answer: { x: 3, y: 5, rot: 1 } },
            { id: 'p3', type: 'I', x: 4, y: 0, rot: 0, isFixed: false, answer: { x: 4, y: 5, rot: 1 } },
            { id: 'p4', type: 'L', x: 5, y: 0, rot: 1, isFixed: false, answer: { x: 1, y: 2, rot: 3 } },
            { id: 'p5', type: 'L', x: 0, y: 5, rot: 0, isFixed: false, answer: { x: 1, y: 0, rot: 1 } },
            { id: 'p6', type: 'L', x: 0, y: 4, rot: 3, isFixed: false, answer: { x: 2, y: 0, rot: 2 } },
            { id: 'p7', type: 'L', x: 5, y: 4, rot: 2, isFixed: false, answer: { x: 2, y: 5, rot: 0 } }
        ]
    },
    {
        // Stage 9: "거울의 방" (5x5)
        // 뒤집기(Flip)의 개념을 본격적으로 테스트. ASYM 파이프를 상하/좌우로 뒤집지 않으면 절대 깰 수 없음.
        cols: 5, rows: 5,
        optimalMoves: 15,
        pipes: [
            { id: 'start', type: 'ONE_WAY', x: 0, y: 0, rot: 3, isFixed: true, start: true },
            { id: 'end', type: 'ONE_WAY', x: 4, y: 4, rot: 2, isFixed: true, target: true },
            
            { id: 'p1', type: 'ASYM', x: 4, y: 0, rot: 0, isFixed: false, answer: { x: 1, y: 0, rot: 2, flipX: -1 } },
            { id: 'p2', type: 'ASYM', x: 4, y: 1, rot: 2, isFixed: false, answer: { x: 1, y: 1, rot: 0, flipY: -1 } },
            { id: 'p3', type: 'ASYM', x: 4, y: 2, rot: 1, isFixed: false, answer: { x: 2, y: 1, rot: 2, flipX: -1 } },
            { id: 'p4', type: 'ASYM', x: 4, y: 3, rot: 3, isFixed: false, answer: { x: 2, y: 2, rot: 0, flipY: -1 } },
            { id: 'p5', type: 'ASYM', x: 0, y: 4, rot: 0, isFixed: false, answer: { x: 3, y: 2, rot: 2, flipX: -1 } },
            { id: 'p6', type: 'ASYM', x: 1, y: 4, rot: 1, isFixed: false, answer: { x: 3, y: 3, rot: 0, flipY: -1 } },
            { id: 'p7', type: 'I', x: 2, y: 4, rot: 1, isFixed: false, answer: { x: 4, y: 3, rot: 0 } }
        ]
    },
    {
        // Stage 10: "중간고사: 교차로" (6x6)
        // 밀기, 돌리기, 뒤집기가 모두 섞여 있으며 CROSS 파이프를 활용해 물줄기를 두 번 통과시켜야 하는 고난도
        cols: 6, rows: 6,
        optimalMoves: 22,
        pipes: [
            { id: 'start', type: 'ONE_WAY', x: 1, y: 1, rot: 3, isFixed: true, start: true }, 
            { id: 'end', type: 'ONE_WAY', x: 4, y: 4, rot: 1, isFixed: true, target: true },
            
            // 중앙 교차로 (이 곳을 가로/세로로 모두 지나가야 함)
            { id: 'cross1', type: 'CROSS', x: 3, y: 3, rot: 0, isFixed: false, answer: { x: 3, y: 3, rot: 0 } },
            
            { id: 'p1', type: 'I', x: 0, y: 0, rot: 0, isFixed: false, answer: { x: 2, y: 1, rot: 1 } },
            { id: 'p2', type: 'L', x: 1, y: 0, rot: 1, isFixed: false, answer: { x: 3, y: 1, rot: 2 } },
            { id: 'p3', type: 'I', x: 2, y: 0, rot: 1, isFixed: false, answer: { x: 3, y: 2, rot: 0 } },
            
            // 여기서 CROSS(3,3)를 위에서 아래로 통과함
            
            { id: 'p4', type: 'L', x: 3, y: 0, rot: 2, isFixed: false, answer: { x: 3, y: 4, rot: 0 } },
            { id: 'p5', type: 'ASYM', x: 4, y: 0, rot: 0, isFixed: false, answer: { x: 2, y: 4, rot: 1, flipX: -1 } },
            { id: 'p6', type: 'I', x: 5, y: 0, rot: 0, isFixed: false, answer: { x: 2, y: 3, rot: 0 } },
            { id: 'p7', type: 'L', x: 0, y: 2, rot: 3, isFixed: false, answer: { x: 1, y: 3, rot: 1 } },
            
            // 여기서 CROSS(3,3)를 왼쪽에서 오른쪽으로 통과함
            
            { id: 'p8', type: 'I', x: 5, y: 3, rot: 0, isFixed: false, answer: { x: 4, y: 3, rot: 1 } },
            
            // 함정 파이프들
            { id: 'decoy1', type: 'CROSS', x: 0, y: 5, rot: 0, isFixed: false, answer: { x: 0, y: 5, rot: 0 } },
            { id: 'decoy2', type: 'T', x: 1, y: 5, rot: 1, isFixed: false, answer: { x: 1, y: 5, rot: 1 } }
        ]
    }
];
