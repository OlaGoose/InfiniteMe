# Database Setup Guide

## Supabase 数据库配置指南

### 1. 初始化数据库

在 Supabase Dashboard 中执行以下步骤：

1. 进入你的项目
2. 点击左侧菜单 "SQL Editor"
3. 点击 "New Query"
4. 复制并执行 `lib/supabase/schema.sql` 的内容

### 2. 运行迁移（如果数据库已存在）

如果你的数据库已经创建，需要运行迁移脚本添加缺失的字段：

1. 在 SQL Editor 中执行 `lib/supabase/migrations/001_add_anki_fields.sql`
2. 确认所有字段已成功添加

### 3. 验证数据库结构

运行以下 SQL 查询验证表结构：

```sql
-- 查看 flashcards 表结构
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'flashcards' 
ORDER BY ordinal_position;

-- 查看所有索引
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### 4. 数据库表说明

#### user_stats
存储用户统计数据：步数、距离、完成对话数、学习单词数、位置、头像、库存等。

#### checkpoints
存储检查点数据：名称、类型（chat/challenge/shop）、位置、难度、场景、NPC 角色、对话提示等。

#### flashcards
存储单词卡数据：
- 基础字段：type, front, back, context, review_count
- Anki SM-2 字段：ease_factor, interval, next_review_date, last_review_date, quality

#### event_history
存储用户交互历史记录：检查点信息、对话消息、挑战结果等。

### 5. Row Level Security (RLS)

**重要：** 建议在生产环境中启用 RLS 保护用户数据：

```sql
-- 启用 RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_history ENABLE ROW LEVEL SECURITY;

-- 创建策略（示例：允许用户访问自己的数据）
CREATE POLICY "Users can access their own data" ON user_stats
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can access their own checkpoints" ON checkpoints
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can access their own flashcards" ON flashcards
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can access their own history" ON event_history
  FOR ALL USING (user_id = current_setting('app.current_user_id', true));
```

### 6. 环境变量配置

确保 `.env.local` 文件包含：

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 7. 常见问题

#### Q: 数据保存失败
A: 检查 Supabase 控制台的 Logs，确认字段名和类型是否匹配。

#### Q: Anki 功能不工作
A: 确保已运行迁移脚本添加 Anki 相关字段。

#### Q: 性能问题
A: 检查索引是否创建成功，考虑为常用查询字段添加索引。

### 8. 性能优化建议

- 定期清理旧的 event_history 记录
- 为高频查询字段添加索引
- 使用 Supabase 的 Connection Pooling
- 启用数据库的 Statement Timeout 防止长时间查询
