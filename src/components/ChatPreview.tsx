import type { ScriptConfig } from '../types';

interface ChatPreviewProps {
  scripts: ScriptConfig[];
  sampleName: string;
}

export default function ChatPreview({ scripts, sampleName }: ChatPreviewProps) {
  const active = scripts.filter((s) => s.text.trim() !== '');

  return (
    <div className="chat-preview">
      <div className="cp-bar">
        <span className="cp-bar-title">{sampleName}</span>
      </div>

      <div className="cp-body">
        {active.length === 0 ? (
          <div className="cp-empty">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="24" height="24" rx="6" fill="#E5E5E5" />
              <path d="M10 14h12M10 18h8" stroke="#C4C4C4" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="cp-empty-main">配置消息后</p>
            <p className="cp-empty-sub">这里实时预览客户收到的效果</p>
          </div>
        ) : (
          <div className="cp-msgs">
            {active.map((s, i) => {
              const isArticle = s.type === 'article';
              return (
                <div key={s.id} className="cp-row">
                  <span className="cp-num">{i + 1}</span>
                  {isArticle ? (
                    <div className="cp-bubble cp-article">
                      <div className="cp-article-text">
                        <span className="cp-article-title">
                          收藏夹第 {s.articleIndex} 篇文章
                        </span>
                        <span className="cp-article-desc">
                          点击查看文章详情内容...
                        </span>
                      </div>
                      <div className="cp-article-thumb">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="3" fill="#D4D4D4" />
                          <path d="M8 14l2.5-2.5 1.5 1.5L15 9l3 3.5V16H8z" fill="#fff" opacity=".5" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="cp-bubble">
                      {s.prependName && sampleName ? (
                        <>
                          <strong>{sampleName}</strong>，{s.text}
                        </>
                      ) : (
                        s.text
                      )}
                    </div>
                  )}
                  <div className="cp-avatar">我</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
