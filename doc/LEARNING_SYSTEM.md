# 📚 StepTrek 结构化学习系统

## 概述

基于现代英语教育方法和主流英语学习App（如Duolingo、Memrise、Rosetta Stone等）的教学理念，我们重新设计了一个系统化、渐进式的学习流程，替代原有的直接对话模式。

## 核心教学理念

### 1. **Comprehensible Input（可理解性输入）**
- 先学习关键词汇和句型，再进入实践
- 提供充分的上下文和视觉辅助
- 符合Krashen的 i+1 理论

### 2. **Multimodal Learning（多模态学习）**
- 结合文字、图片、音频、语音识别
- 同时训练听、说、读、写能力
- 增强记忆效果

### 3. **Spaced Repetition（间隔重复）**
- 使用Anki算法管理flashcard复习
- 科学的记忆曲线
- 长期记忆巩固

### 4. **Immediate Feedback（即时反馈）**
- 每个练习都有即时的对错反馈
- 鼓励性的正向反馈
- 具体的改进建议

### 5. **Gamification（游戏化）**
- 可视化的进度条
- 完成奖励（steps）
- 成就感递增

### 6. **Microlearning（微学习）**
- 短时高频的学习会话
- 每个阶段3-5分钟
- 降低学习压力

## 学习流程（7个阶段）

### 阶段1: Welcome & Context（欢迎和情境介绍）
**目标**: 建立学习情境，激发学习兴趣

**内容**:
- 场景图片和描述
- 学习目标说明
- 难度等级展示
- NPC角色介绍

**设计依据**: 
- Rosetta Stone的沉浸式方法
- 提供足够的背景信息降低焦虑

**用户体验**:
```
✨ 视觉冲击 → 场景理解 → 学习动机
```

---

### 阶段2: Vocabulary Preview（词汇预览）
**目标**: 学习场景关键词汇

**内容**:
- 3-5个核心单词/短语
- 音标和发音示范
- 中文翻译
- 实用例句
- 语音播放功能

**设计依据**:
- Memrise的词汇卡片设计
- 先输入后输出的原则
- 每个单词都有真实语境

**练习方式**:
- 逐个学习，点击查看
- 可重复听发音
- 例句帮助理解用法

**UI特点**:
- 大字体显示单词
- 渐变色背景吸引注意
- 进度条显示学习进展

---

### 阶段3: Listening Practice（听力练习）
**目标**: 训练听力理解能力

**内容**:
- 2-3个短对话（AI生成）
- 理解性问题
- 3个选项（单选题）
- 可重复播放音频

**设计依据**:
- Duolingo的听力训练模式
- 先听后读，培养语感
- 问题测试理解而非记忆

**练习方式**:
1. 点击播放音频
2. 阅读问题
3. 选择答案
4. 即时反馈（✅/❌）
5. 答对后自动进入下一题

**难度控制**:
- 语速根据难度等级调整
- 句子长度逐渐增加
- 词汇控制在学习范围内

---

### 阶段4: Pronunciation Practice（发音练习）
**目标**: 提高口语发音准确性

**内容**:
- 2-3个目标句子
- 中文翻译
- 标准发音示范
- 语音识别评分（计划中）

**设计依据**:
- Elsa Speak的发音训练理念
- 口语输出的重要性
- 自信心建立

**练习方式**:
1. 查看目标句子
2. 听标准发音
3. 点击录音按钮
4. 说出句子
5. 获得反馈（当前版本可跳过）

**技术实现**:
- 使用Web Speech API
- 实时显示识别文本
- 语音识别结果反馈

---

### 阶段5: Pattern Practice（句型练习）
**目标**: 掌握常用句型结构

**内容**:
- 3-4个句型练习
- 填空题
- 提示信息
- 正确答案反馈

**设计依据**:
- Babbel的句型教学法
- 输出练习巩固记忆
- 语法结构内化

**练习类型**:
1. **填空题**: `Could you ___ help me?` (please)
2. **多选题**: 选择正确的词填入
3. **排序题**: 将单词排列成正确句子（计划中）

**互动方式**:
- 输入框输入答案
- 按Enter提交
- 即时显示正确答案
- 答对后自动下一题

---

### 阶段6: Guided Conversation（引导式对话）
**目标**: 准备进入真实对话

**内容**:
- 对话准备提示
- 学习回顾
- 心理准备

**设计依据**:
- 从练习到实践的过渡
- 降低对话焦虑
- 建立自信心

**说明内容**:
- 即将开始的对话场景
- 可以使用的句型提示
- 已学词汇回顾
- 鼓励性文字

---

### 阶段7: Free Conversation（自由对话）
**目标**: 应用所学进行真实对话

**内容**:
- 总结学习成果
- 展示学习的词汇数量
- 完成的练习类型
- 奖励steps（+50）
- 进入实际AI对话

**设计依据**:
- 学以致用的原则
- 真实语境实践
- 正向激励

**过渡到原有对话系统**:
- 点击开始对话
- 无缝进入AI聊天界面
- 保留所有原有功能（翻译、优化、flashcard等）
- 获得steps奖励

---

## 技术实现

### AI内容生成

使用AI（Gemini/OpenAI/Doubao）根据关卡特点动态生成学习内容：

```typescript
{
  "vocabulary": [
    {
      "word": "greeting",
      "translation": "问候",
      "phonetic": "/ˈɡriːtɪŋ/",
      "exampleSentence": "A warm greeting makes people feel welcome.",
      "exampleTranslation": "热情的问候让人感到受欢迎。"
    }
  ],
  "listening": [
    {
      "audioText": "Hello! How can I help you today?",
      "question": "What is the speaker offering?",
      "options": ["Help", "Food", "Directions"],
      "correctAnswer": "Help"
    }
  ],
  "patterns": [
    {
      "type": "fill-blank",
      "question": "Could you ___ help me?",
      "correctAnswer": "please",
      "hint": "A polite word"
    }
  ],
  "pronunciation": [
    {
      "targetSentence": "Hello, how are you?",
      "translation": "你好，你怎么样？",
      "minimumScore": 70
    }
  ]
}
```

### 进度追踪

```typescript
interface LearningProgress {
  checkpointId: string;
  currentStage: LearningStage;
  stageProgress: {
    welcome: boolean;
    vocabulary: number;        // 0-100%
    listening: number;         // 0-100%
    pronunciation: number;     // 0-100%
    pattern: number;           // 0-100%
    guided: number;            // 0-100%
    free: number;              // 0-100%
    review: boolean;
  };
  vocabularyMastery: { [word: string]: number };
  overallScore: number;
  completedAt?: number;
  earnedSteps: number;
}
```

### UI/UX设计原则

1. **色彩语言**
   - 橙色/粉色渐变：温暖、友好、鼓励
   - 不同阶段使用不同色调区分
   - 高对比度确保可读性

2. **动画反馈**
   - `animate-in` 类：进场动画
   - `slide-in-from-right`: 阶段切换
   - `pulse`: 按钮hover效果
   - `scale`: 点击反馈

3. **响应式设计**
   - 移动优先
   - 全屏模态窗口
   - 大字体易读
   - 大按钮易点

4. **无障碍设计**
   - 语义化HTML
   - ARIA标签
   - 键盘导航（Enter提交）
   - 高对比度

## 教学效果

### 与传统直接对话相比的优势

| 方面 | 传统直接对话 | 结构化学习流程 |
|------|-------------|----------------|
| **准备程度** | 无准备直接对话 | 充分准备后对话 |
| **焦虑程度** | 高（不知道说什么） | 低（已学习关键内容） |
| **学习效果** | 被动接收 | 主动练习 |
| **记忆保持** | 短期记忆 | 长期记忆（间隔重复） |
| **技能训练** | 主要是阅读 | 听说读写全面 |
| **自信心** | 容易挫败 | 逐步建立 |
| **个性化** | 有限 | 高度定制 |

### 学习时长估算

- **Welcome**: ~1分钟
- **Vocabulary**: ~2-3分钟（3-5个单词）
- **Listening**: ~2-3分钟（2-3题）
- **Pronunciation**: ~2-3分钟（2-3句）
- **Pattern**: ~2-3分钟（3-4题）
- **Guided**: ~1分钟
- **Free**: 自由时长

**总计**: 约10-15分钟完成学习准备，然后进入自由对话

### 预期学习成果

完成一个完整的学习流程后，用户将：

✅ 掌握 3-5 个核心词汇
✅ 理解 2-3 个关键句型
✅ 练习 2-3 次听力理解
✅ 完成 2-3 次发音练习
✅ 完成 3-4 道句型练习
✅ 建立对话自信心
✅ 获得 50 steps 奖励

## 未来改进方向

### 1. 高级发音评分
- 集成更专业的语音识别API
- 提供音素级别的发音反馈
- 可视化发音波形对比

### 2. 自适应难度
- 根据用户表现动态调整题目难度
- 错误分析和个性化推荐
- 智能跳过已掌握内容

### 3. 社交功能
- 与其他用户对话
- 真人语音对话（语音聊天室）
- 学习小组和挑战赛

### 4. 学习分析
- 详细的学习报告
- 优势和弱点分析
- 学习曲线可视化
- 个性化学习建议

### 5. 更多练习类型
- 拖拽排序题
- 图片匹配题
- 角色扮演模拟
- 视频配音练习

### 6. 离线支持
- 缓存学习内容
- 离线练习模式
- 同步学习进度

## 参考资料

- **Duolingo**: Gamification and microlearning
- **Memrise**: Spaced repetition and vocabulary cards
- **Rosetta Stone**: Immersive learning and context
- **Babbel**: Practical conversation and pattern practice
- **Elsa Speak**: Pronunciation training
- **Krashen's Input Hypothesis**: Comprehensible input theory
- **Web Speech API**: Voice recognition technology

---

**设计时间**: 2026年1月
**版本**: 1.0.0
**状态**: ✅ 已实现核心功能
