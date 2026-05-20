import { useState, type ReactNode } from "react";

type SuggestionCategory = {
  icon: string;
  label: string;
  prompts: string[];
};

type EmptyStateProps = {
  inputBox: ReactNode;
  onSendMessage: (text: string) => void;
  suggestions: SuggestionCategory[];
};

export const EmptyState = ({
  inputBox,
  onSendMessage,
  suggestions,
}: EmptyStateProps) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const activeSuggestions = suggestions.find(
    (cat) => cat.label === activeCategory,
  );

  return (
    <div className="empty-state">
      <p className="welcome-text">What can I help you with?</p>
      {inputBox}
      <div className="suggestions">
        <SuggestionPills
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          suggestions={suggestions}
        />
        {activeSuggestions && (
          <div className="suggestion-prompts">
            {activeSuggestions.prompts.map((prompt) => (
              <button
                className="suggestion"
                key={prompt}
                onClick={() => onSendMessage(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

type SuggestionPillsProps = {
  activeCategory: string | null;
  onSelect: (label: string | null) => void;
  suggestions: SuggestionCategory[];
};

const SuggestionPills = ({
  activeCategory,
  onSelect,
  suggestions,
}: SuggestionPillsProps) => (
  <div className="suggestion-pills">
    {suggestions.map((cat) => (
      <button
        className={`suggestion-pill ${activeCategory === cat.label ? "active" : ""}`}
        key={cat.label}
        onClick={() =>
          onSelect(activeCategory === cat.label ? null : cat.label)
        }
        type="button"
      >
        <svg
          fill="none"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d={cat.icon} />
        </svg>
        {cat.label}
      </button>
    ))}
  </div>
);
