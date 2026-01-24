/**
 * YouTube Transcript Service
 * 真实的字幕提取和切割功能
 */

import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
  duration: number; // seconds
}

export interface VideoTranscriptData {
  segments: TranscriptSegment[];
  hasSubtitles: boolean;
  totalDuration: number;
  language: string;
}

/**
 * 获取YouTube视频的字幕
 * @param videoId - YouTube video ID
 * @returns 字幕数据
 */
export async function getYouTubeTranscript(videoId: string): Promise<VideoTranscriptData> {
  try {
    console.log(`🎬 Fetching transcript for video: ${videoId}`);
    
    // 使用 youtube-transcript 库获取字幕
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en', // 英文字幕
    });

    if (!transcript || transcript.length === 0) {
      console.warn('No transcript found');
      return {
        segments: [],
        hasSubtitles: false,
        totalDuration: 0,
        language: 'en',
      };
    }

    console.log(`✅ Found ${transcript.length} transcript items`);

    // 转换为标准格式
    const rawSegments = transcript.map(item => ({
      start: item.offset / 1000, // 转换为秒
      text: item.text.trim(),
      duration: item.duration / 1000, // 转换为秒
    }));

    // 合并和切割成 15-45 秒的片段
    const mergedSegments = mergeIntoOptimalSegments(rawSegments);

    const totalDuration = rawSegments.length > 0 
      ? rawSegments[rawSegments.length - 1].start + rawSegments[rawSegments.length - 1].duration
      : 0;

    return {
      segments: mergedSegments,
      hasSubtitles: true,
      totalDuration,
      language: 'en',
    };
  } catch (error: any) {
    console.error('Failed to fetch transcript:', error);
    
    // 检查是否是字幕不可用
    if (error.message && error.message.includes('Could not find')) {
      return {
        segments: [],
        hasSubtitles: false,
        totalDuration: 0,
        language: 'en',
      };
    }
    
    throw error;
  }
}

/**
 * 将原始字幕片段合并成 15-45 秒的学习片段
 * @param rawSegments - 原始字幕片段
 * @returns 优化后的学习片段
 */
function mergeIntoOptimalSegments(
  rawSegments: Array<{ start: number; text: string; duration: number }>
): TranscriptSegment[] {
  const MIN_SEGMENT_DURATION = 15; // 最小15秒
  const MAX_SEGMENT_DURATION = 45; // 最大45秒
  const OPTIMAL_DURATION = 30; // 理想30秒

  const result: TranscriptSegment[] = [];
  let currentSegment: {
    start: number;
    texts: string[];
    duration: number;
  } | null = null;

  for (let i = 0; i < rawSegments.length; i++) {
    const item = rawSegments[i];
    
    if (!currentSegment) {
      // 开始新片段
      currentSegment = {
        start: item.start,
        texts: [item.text],
        duration: item.duration,
      };
    } else {
      // 检查是否应该合并到当前片段
      const potentialDuration = (item.start + item.duration) - currentSegment.start;
      
      if (potentialDuration <= MAX_SEGMENT_DURATION) {
        // 可以合并
        currentSegment.texts.push(item.text);
        currentSegment.duration = potentialDuration;
      } else {
        // 当前片段已满，保存并开始新片段
        if (currentSegment.duration >= MIN_SEGMENT_DURATION) {
          result.push({
            start: currentSegment.start,
            end: currentSegment.start + currentSegment.duration,
            text: currentSegment.texts.join(' '),
            duration: currentSegment.duration,
          });
        }
        
        // 开始新片段
        currentSegment = {
          start: item.start,
          texts: [item.text],
          duration: item.duration,
        };
      }
    }
    
    // 如果已经接近理想长度且是句子结尾，提前结束片段
    if (currentSegment && currentSegment.duration >= OPTIMAL_DURATION) {
      const lastText = currentSegment.texts[currentSegment.texts.length - 1];
      if (lastText.match(/[.!?]$/)) {
        result.push({
          start: currentSegment.start,
          end: currentSegment.start + currentSegment.duration,
          text: currentSegment.texts.join(' '),
          duration: currentSegment.duration,
        });
        currentSegment = null;
      }
    }
  }

  // 处理最后一个片段
  if (currentSegment && currentSegment.duration >= MIN_SEGMENT_DURATION) {
    result.push({
      start: currentSegment.start,
      end: currentSegment.start + currentSegment.duration,
      text: currentSegment.texts.join(' '),
      duration: currentSegment.duration,
    });
  }

  console.log(`📊 Merged ${rawSegments.length} raw items into ${result.length} optimal segments`);
  
  return result;
}

/**
 * 解析手动输入的字幕文本（时间戳格式）
 * 格式示例：
 * 0:00
 * Text here
 * 0:06
 * More text
 * @param subtitleText - 用户输入的字幕文本
 * @returns 解析后的字幕片段
 */
export function parseManualSubtitles(subtitleText: string): TranscriptSegment[] {
  const lines = subtitleText.trim().split(/\r?\n/);
  const segments: TranscriptSegment[] = [];
  
  let currentTime = 0;
  let currentText: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // 检查是否是时间戳格式 (例如: 0:00, 0:06, 1:23)
    const timeMatch = line.match(/^(\d+):(\d{2})$/);
    
    if (timeMatch) {
      // 保存前一个片段
      if (currentText.length > 0 && currentTime >= 0) {
        const text = currentText.join(' ').trim();
        if (text) {
          // 计算结束时间（使用下一个时间戳或估算）
          let endTime = currentTime + 10; // 默认10秒
          if (i + 1 < lines.length) {
            const nextTimeMatch = lines[i + 1].trim().match(/^(\d+):(\d{2})$/);
            if (nextTimeMatch) {
              endTime = parseInt(nextTimeMatch[1]) * 60 + parseInt(nextTimeMatch[2]);
            }
          }
          
          segments.push({
            start: currentTime,
            end: endTime,
            text: text,
            duration: endTime - currentTime,
          });
        }
      }
      
      // 开始新片段
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      currentTime = minutes * 60 + seconds;
      currentText = [];
    } else {
      // 这是文本行，添加到当前片段
      currentText.push(line);
    }
  }
  
  // 处理最后一个片段
  if (currentText.length > 0) {
    const text = currentText.join(' ').trim();
    if (text) {
      const endTime = currentTime + 10; // 默认10秒
      segments.push({
        start: currentTime,
        end: endTime,
        text: text,
        duration: endTime - currentTime,
      });
    }
  }
  
  console.log(`📝 Parsed ${segments.length} segments from manual input`);
  
  // 合并成15-45秒的片段
  return mergeIntoOptimalSegments(segments.map(s => ({
    start: s.start,
    text: s.text,
    duration: s.duration,
  })));
}

/**
 * 从YouTube URL提取视频信息
 * @param videoId - YouTube video ID
 * @returns 视频信息
 */
export async function getVideoInfo(videoId: string): Promise<{
  title: string;
  description: string;
  duration: number;
}> {
  // 这里可以集成 YouTube Data API 获取视频信息
  // 或者使用 oembed API 获取基本信息
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || 'YouTube Video',
        description: data.author_name || '',
        duration: 0, // oembed 不提供时长
      };
    }
  } catch (error) {
    console.warn('Failed to fetch video info from oembed:', error);
  }

  // Fallback
  return {
    title: 'YouTube Video',
    description: '',
    duration: 0,
  };
}
