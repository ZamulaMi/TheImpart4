import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ArrowRight, Sparkles } from 'lucide-react';
import { Article, SiteLanguage } from '../types';
import { formatTimeAgoOrDate } from '../utils/date';
import { searchArticlesWithFuzzy, getHighlightedChunks } from '../utils/search';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  lang: SiteLanguage;
  onSelectArticle: (id: string) => void;
  onShowAllSearchResults: (query: string, results: Article[]) => void;
}

const HighlightedText: React.FC<{ text: string; query: string; className?: string }> = ({
  text,
  query,
  className,
}) => {
  const chunks = useMemo(() => getHighlightedChunks(text, query), [text, query]);

  return (
    <span className={className}>
      {chunks.map((chunk, i) =>
        chunk.isMatch ? (
          <mark
            key={i}
            className="bg-neutral-200/90 text-neutral-950 font-semibold px-0.5 rounded-xs not-italic"
          >
            {chunk.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{chunk.text}</React.Fragment>
        )
      )}
    </span>
  );
};

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  articles,
  lang,
  onSelectArticle,
  onShowAllSearchResults,
}) => {
  const [query, setQuery] = useState('');
  const [rendered, setRendered] = useState(isOpen);
  const [isAnimateIn, setIsAnimateIn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Плавне монтування та розмонтування анімацією, блокування скролу фонової сторінки
  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setQuery('');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      const timer = requestAnimationFrame(() => {
        setIsAnimateIn(true);
      });
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => {
        cancelAnimationFrame(timer);
        clearTimeout(focusTimer);
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      };
    } else {
      setIsAnimateIn(false);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      const timer = setTimeout(() => {
        setRendered(false);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isEn = lang === 'en';
  const cleanQuery = query.trim();

  // Розумний пошук з урахуванням одруківок, відмінків та транслітерації
  const searchResults = useMemo(() => {
    if (!cleanQuery) return [];
    return searchArticlesWithFuzzy(articles, cleanQuery, lang);
  }, [articles, cleanQuery, lang]);

  const matchingArticles = useMemo(() => {
    return searchResults.map((r) => r.article);
  }, [searchResults]);

  const hasTypoMatches = useMemo(() => {
    return searchResults.some((r) => r.hasFuzzyMatch);
  }, [searchResults]);

  const isMouseDownOnBackdropRef = useRef(false);

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    // Не закривати, якщо клік припав на вертикальну смугу прокрутки (scrollbar)
    const rect = e.currentTarget.getBoundingClientRect();
    const isScrollbar = e.clientX > rect.left + e.currentTarget.clientWidth;
    if (isScrollbar) {
      isMouseDownOnBackdropRef.current = false;
      return;
    }
    isMouseDownOnBackdropRef.current = true;
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLElement>) => {
    if (isMouseDownOnBackdropRef.current) {
      onClose();
    }
    isMouseDownOnBackdropRef.current = false;
  };

  const handleOpenAll = () => {
    if (cleanQuery) {
      onShowAllSearchResults(cleanQuery, matchingArticles);
      onClose();
    }
  };

  const handleItemClick = (id: string) => {
    onSelectArticle(id);
    onClose();
  };

  if (!rendered) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex flex-col bg-white/60 sm:bg-white/65 backdrop-blur-2xl overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
        isAnimateIn ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* 
        Верхня панель модального вікна (Header):
        Натискання на область header НЕ закриває пошук (закриття тільки хрестиком або в області body)
      */}
      <header
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white/40 backdrop-blur-xl py-3.5 sm:py-4 border-b border-neutral-200/40 cursor-default"
      >
        <div className="w-[92%] sm:w-[90%] md:w-[calc(26/34*100%)] mx-auto flex items-center justify-between min-h-[38px]">
          <div className="overflow-hidden py-0.5 -my-0.5">
            <span
              className="block text-xl sm:text-2xl font-medium tracking-tight text-neutral-400 select-none cursor-default"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              The Impart
            </span>
          </div>

          {/* Кнопка-хрестик: закриває вікно пошуку */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Закрити пошук"
            className="text-black hover:opacity-60 active:scale-95 transition-all cursor-pointer focus:outline-none flex items-center justify-center w-10 h-10 -mr-2"
          >
            <X className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>
      </header>

      {/* Центральна частина (Body): клік на напівпрозоре тло тут закриває модальне вікно */}
      <div
        className="flex-1 w-full overflow-y-auto"
        onMouseDown={handleBackdropMouseDown}
        onClick={handleBackdropClick}
      >
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-8 flex flex-col justify-start pt-6 sm:pt-12 pb-12 min-h-full">
          {/* Поле вводу та зона під ним — біла область з пошуком (клік сюди НЕ закриває вікно) */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className={`w-full bg-white/95 sm:bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-7 shadow-[0_16px_45px_rgb(0,0,0,0.08)] border border-neutral-200/80 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] select-text cursor-default ${
              isAnimateIn ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-[0.97]'
            }`}
          >
            {/* Світле поле вводу з контрастним текстом */}
            <div className="w-full relative flex items-center bg-neutral-50/90 hover:bg-neutral-50 focus-within:bg-white border-2 border-neutral-200 focus-within:border-black rounded-xl px-4 py-3 sm:py-3.5 transition-all shadow-2xs">
              <Search className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-500 mr-3 shrink-0 stroke-[2]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && cleanQuery) {
                    e.preventDefault();
                    handleOpenAll();
                  }
                }}
                placeholder={isEn ? 'Search articles...' : 'Пошук серед статей...'}
                className="w-full text-base sm:text-xl font-serif text-neutral-900 placeholder:text-neutral-400 placeholder:font-serif focus:outline-none bg-transparent leading-relaxed"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-xs uppercase tracking-wider font-semibold text-neutral-500 hover:text-black bg-neutral-200/70 hover:bg-neutral-300 px-2.5 py-1 rounded transition-colors cursor-pointer shrink-0 ml-2"
                >
                  {isEn ? 'Clear' : 'Очистити'}
                </button>
              )}
            </div>

            {/* Зона трошки нижче поля вводу: коротка лаконічна підказка без швидких тем */}
            {!cleanQuery && (
              <div className="mt-3.5 pt-3 border-t border-neutral-100">
                <p className="text-xs sm:text-sm text-neutral-500 font-sans tracking-wide text-center">
                  {isEn
                    ? 'Search by title, description or content'
                    : 'Пошук за заголовком, описом або текстом'}
                </p>
              </div>
            )}
          </div>

          {/* Результати пошуку (клік сюди також НЕ закриває модальне вікно без вибору статті) */}
          {cleanQuery && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="w-full mt-6 space-y-3 animate-page-fade-in select-text"
            >
              {/* Панель з кількістю, розумною підказкою та кнопкою "Відкрити всі результати" */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-200/80 gap-2.5 px-1">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-xs uppercase tracking-wider text-neutral-800 font-semibold font-sans">
                    {isEn
                      ? `Found ${matchingArticles.length} ${matchingArticles.length === 1 ? 'article' : 'articles'}`
                      : `Знайдено матеріалів: ${matchingArticles.length}`}
                  </span>
                  {hasTypoMatches && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 bg-neutral-100/90 border border-neutral-200/70 px-2 py-0.5 rounded-full font-sans">
                      <Sparkles className="w-3 h-3 text-neutral-500" />
                      <span>{isEn ? 'Typo-tolerant' : 'З урахуванням одруківок'}</span>
                    </span>
                  )}
                </div>

                {matchingArticles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenAll}
                    className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-white hover:bg-neutral-800 bg-black active:scale-95 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer group shadow-2xs"
                  >
                    <span>{isEn ? 'Open all found articles' : 'Відкрити всі знайдені статті'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>

              {/* Список знайдених статей: світлі картки з чітким текстом */}
              {matchingArticles.length > 0 ? (
                <div className="space-y-2.5">
                  {matchingArticles.map((article) => {
                    const title = isEn && article.titleEn ? article.titleEn : article.title;
                    const excerpt = isEn && article.excerptEn ? article.excerptEn : article.excerpt;
                    const category = isEn && article.categoryEn ? article.categoryEn : article.category;
                    const timeAgo = formatTimeAgoOrDate(article.createdAt, article.date, article.id, lang);

                    return (
                      <div
                        key={article.id}
                        onClick={() => handleItemClick(article.id)}
                        className="group cursor-pointer p-4 sm:p-4.5 rounded-xl border border-neutral-200/90 bg-white hover:border-black/50 hover:bg-neutral-50/80 transition-all duration-200 flex items-center justify-between gap-4 shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider mb-1">
                            <span className="font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                              {category}
                            </span>
                            <span className="text-neutral-400">•</span>
                            <span className="text-neutral-500 font-medium">{timeAgo}</span>
                          </div>
                          <h4
                            className="text-base sm:text-lg font-serif font-medium text-neutral-900 group-hover:text-neutral-700 transition-colors line-clamp-1"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                          >
                            <HighlightedText text={title} query={cleanQuery} />
                          </h4>
                          {excerpt && (
                            <p className="text-xs text-neutral-600 line-clamp-2 mt-1 font-sans leading-relaxed">
                              <HighlightedText text={excerpt} query={cleanQuery} />
                            </p>
                          )}
                        </div>

                        {article.coverImage && (
                          <div className="w-16 h-12 sm:w-20 sm:h-14 shrink-0 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200/60 shadow-2xs">
                            <img
                              src={article.coverImage}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 px-6 text-center bg-white rounded-xl border border-neutral-200 shadow-2xs">
                  <p className="text-neutral-700 font-serif italic text-base sm:text-lg">
                    {isEn ? 'No articles match your query.' : 'За вашим запитом нічого не знайдено.'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1.5 font-sans">
                    {isEn
                      ? 'Try another keyword or shorten your search.'
                      : 'Спробуйте спростити запит або використати інші ключові слова.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
