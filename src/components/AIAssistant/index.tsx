/**
 * ★★★ AI 智能数据助手 — 语音升级版 ★★★
 *
 * 新功能：
 * 1. 语音输入：点击🎤按钮说话，自动识别为文字
 * 2. 语音播报：AI 回答自动朗读（可切换关闭）
 * 3. 语音导航：说"打开订单管理"→自动跳转页面
 * 4. Web Speech API 实现，无需额外依赖
 */

import { useState, useRef, useEffect } from 'react';
import { Button, Input, Avatar, Space, Tooltip } from 'antd';
import {
  RobotOutlined,
  CloseOutlined,
  SendOutlined,
  AudioOutlined,
  SoundOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { generateResponse, getQuickQuestions, matchNavigation } from './engine';
import { useNavigate } from 'react-router-dom';
import styles from './index.module.css';

interface Message {
  role: 'user' | 'ai';
  text: string;
  data?: any;
}

/** 检测浏览器是否支持语音 */
const isSpeechSupported = () => {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

/** 检测浏览器是否支持语音合成 */
const isSynthesisSupported = () => {
  return 'speechSynthesis' in window;
};

const AIAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: '你好！我是 **幕幕货运 AI 数据助手** 🤖\n\n现在开始支持 **语音输入** 了！🎤 点击输入框旁边的麦克风按钮说话，我就能听懂。\n\n你也可以说"打开订单管理"来导航页面，试试看！' },
  ]);
  const [input, setInput] = useState('');
  const [replying, setReplying] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const speakTimerRef = useRef<number>(0);

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  /** 文字转语音播报 */
  const speakText = (text: string) => {
    if (!speakEnabled || !isSynthesisSupported()) return;

    // 清除之前的语音
    window.speechSynthesis.cancel();
    clearTimeout(speakTimerRef.current);

    // 延迟一点开始朗读（等消息渲染完成）
    speakTimerRef.current = window.setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(
        // 清理 markdown 格式符号，只保留纯文本
        text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/[•·\-*#]/g, '')
      );
      utterance.lang = 'zh-CN';
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }, 200);
  };

  /** 发送消息 */
  const sendMessage = async (text: string) => {
    const msg = text.trim();
    if (!msg || replying) return;

    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    setReplying(true);

    try {
      // ★★★ 语音导航检测 ★★★
      const navResult = matchNavigation(msg);
      if (navResult) {
        const result = {
          text: `好的，正在为您跳转到 **${navResult.name}** 🚀`,
          data: null,
        };
        setMessages(prev => [...prev, { role: 'ai', text: result.text, data: result.data }]);
        speakText(result.text);
        // 延迟跳转，让用户看到消息
        setTimeout(() => navigate(navResult.path), 800);
        setReplying(false);
        return;
      }

      const result = await generateResponse(msg, messages);
      setMessages(prev => [...prev, { role: 'ai', text: result.text, data: result.data }]);
      speakText(result.text);
    } catch {
      const errMsg = '抱歉，我遇到了一点问题，请稍后再试 😅';
      setMessages(prev => [...prev, { role: 'ai', text: errMsg }]);
    }
    setReplying(false);
  };

  /** ==================== 语音输入 ==================== */

  /** 初始化语音识别 */
  const initRecognition = () => {
    if (!isSpeechSupported()) return null;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    return recognition;
  };

  /** 开始语音识别 */
  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = initRecognition();
    if (!recognition) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: '⚠️ 您的浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器打开。',
      }]);
      return;
    }

    recognitionRef.current = recognition;
    setListening(true);

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setInput(transcript);
          // 自动发送最终识别结果
          sendMessage(transcript);
        } else {
          setInput(transcript);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('语音识别错误:', event.error);
      setListening(false);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setMessages(prev => [...prev, {
          role: 'ai',
          text: `⚠️ 语音识别出错：${event.error === 'not-allowed' ? '请允许使用麦克风权限' : event.error}`,
        }]);
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  /** 停止语音识别 */
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  /** 快捷问答 */
  const handleQuickQuestion = (q: string) => {
    sendMessage(q);
  };

  // 渲染消息中的 Markdown 风格文本
  const renderText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <div key={i} className={styles.bullet} dangerouslySetInnerHTML={{ __html: processed }} />;
      }
      if (/^\d+\./.test(line)) {
        return <div key={i} className={styles.bullet} dangerouslySetInnerHTML={{ __html: processed }} />;
      }
      return <div key={i} className={styles.msgLine} dangerouslySetInnerHTML={{ __html: processed || '&nbsp;' }} />;
    });
  };

  return (
    <>
      {/* 浮动按钮 */}
      <div className={styles.fab} onClick={() => setOpen(!open)}>
        {open ? <CloseOutlined style={{ fontSize: 22 }} /> : <RobotOutlined style={{ fontSize: 22 }} />}
      </div>

      {/* 对话窗口 */}
      {open && (
        <div className={styles.chatWindow}>
          {/* 头部 */}
          <div className={styles.chatHeader}>
            <Space>
              <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <div>
                <div className={styles.headerTitle}>AI 数据助手 · 语音版</div>
                <div className={styles.headerStatus}>
                  {listening ? '🎤 聆听中...' : '在线 · 支持语音'}
                </div>
              </div>
            </Space>
            <Space>
              {/* 语音播报开关 */}
              <Tooltip title={speakEnabled ? '关闭语音播报' : '开启语音播报'}>
                <Button
                  type="text"
                  icon={
                    <SoundOutlined
                      style={{ fontSize: 16, color: speakEnabled ? '#fff' : 'rgba(255,255,255,0.5)' }}
                    />
                  }
                  onClick={() => setSpeakEnabled(!speakEnabled)}
                />
              </Tooltip>
              <Button type="text" icon={<CloseOutlined />} onClick={() => setOpen(false)} style={{ color: '#fff' }} />
            </Space>
          </div>

          {/* 消息列表 */}
          <div className={styles.messageList} ref={listRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.aiMsg}`}>
                {msg.role === 'ai' && (
                  <Avatar icon={<RobotOutlined />} size={28} style={{ backgroundColor: '#1677ff', flexShrink: 0 }} />
                )}
                <div className={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                  {renderText(msg.text)}
                  {/* 数据展示 */}
                  {msg.data?.type === 'stat' && (
                    <div className={styles.dataCard}>
                      <span className={styles.dataValue}>{msg.data.value.toLocaleString()}</span>
                      <span className={styles.dataUnit}>{msg.data.unit}</span>
                    </div>
                  )}
                  {msg.data?.type === 'list' && (
                    <div className={styles.dataCard}>
                      {msg.data.items.map((item: any, idx: number) => (
                        <div key={idx} className={styles.dataRow}>
                          <span>{item.label}</span>
                          <span style={{ color: '#1677ff', fontWeight: 600 }}>{item.value.toLocaleString()}单</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* 导航提示 */}
                  {msg.data?.type === 'navigate' && (
                    <div className={styles.dataCard} style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 24 }}>🚀</span>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>
                        正在跳转到 {msg.data.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 正在输入 */}
            {replying && (
              <div className={styles.message}>
                <Avatar icon={<RobotOutlined />} size={28} style={{ backgroundColor: '#1677ff', flexShrink: 0 }} />
                <div className={styles.aiBubble}>
                  <div className={styles.typing}>
                    <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
                  </div>
                </div>
              </div>
            )}

            {/* 快捷提问 */}
            {messages.length <= 2 && !replying && (
              <div className={styles.quickQuestions}>
                <div className={styles.quickLabel}>💡 试试问 / 说：</div>
                <div className={styles.quickGrid}>
                  {getQuickQuestions().map((q, i) => (
                    <div key={i} className={styles.quickItem} onClick={() => handleQuickQuestion(q)}>
                      {q}
                    </div>
                  ))}
                  <div className={styles.quickItemVoice} onClick={() => handleQuickQuestion('打开订单管理')}>
                    🗣️ 打开订单管理
                  </div>
                  <div className={styles.quickItemVoice} onClick={() => handleQuickQuestion('去数据大屏')}>
                    🗣️ 去数据大屏
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className={styles.inputArea}>
            {/* ★★★ 语音输入按钮 ★★★ */}
            <Tooltip title={listening ? '点击停止' : '点击说话（语音输入）'}>
              <Button
                type="text"
                className={`${styles.voiceBtn} ${listening ? styles.voiceBtnActive : ''}`}
                icon={
                  listening ? (
                    <LoadingOutlined style={{ fontSize: 18 }} />
                  ) : (
                    <AudioOutlined style={{ fontSize: 18 }} />
                  )
                }
                onClick={listening ? stopListening : startListening}
              />
            </Tooltip>

            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onPressEnter={() => sendMessage(input)}
              placeholder={listening ? '🎤 请说话...' : '输入问题或说"打开订单管理"'}
              variant="borderless"
              className={styles.input}
              disabled={replying}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<SendOutlined />}
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || replying}
            />
          </div>

          {/* 语音识别状态指示 */}
          {listening && (
            <div className={styles.voiceStatus}>
              <span className={styles.voiceWave} />
              <span>正在聆听...</span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default AIAssistant;
