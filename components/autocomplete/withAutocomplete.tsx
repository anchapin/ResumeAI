/**
 * withAutocomplete HOC
 * 
 * Higher-order component that adds auto-complete to any textarea.
 * 
 * @example
 * const EditorWithAutocomplete = withAutocomplete(Editor);
 * 
 * <EditorWithAutocomplete
 *   value={text}
 *   onChange={handleChange}
 * />
 */

import React, { useState, useRef, useCallback } from 'react';
import { useAutocompleteEditor } from '../../src/hooks/useAutocompleteEditor';
import { AutocompletePopup } from './AutocompletePopup';
import { InlineCompletion } from './InlineCompletion';
import { BulletSuggestions } from './BulletSuggestions';

export interface WithAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

export function withAutocomplete<P extends WithAutocompleteProps>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AutocompleteEnhanced(props: P) {
    const [showBullets, setShowBullets] = useState(false);
    const [bulletSuggestions, setBulletSuggestions] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const {
      showPopup,
      showInline,
      completions,
      inlineCompletion,
      popupPosition,
      inlinePosition,
      selectedIndex,
      handleKeyDown,
      handleChange,
      handleBlur,
      acceptCompletion,
      dismissCompletions,
    } = useAutocompleteEditor({
      enabled: true,
      debounceMs: 150,
      triggerOnTyping: true,
      minCharsForTrigger: 3,
    });

    /**
     * Handle text change.
     */
    const handleTextChange = useCallback(
      (value: string) => {
        props.onChange(value);
        
        // Get cursor position
        const textarea = textareaRef.current;
        const cursorPos = textarea ? textarea.selectionStart : 0;
        
        handleChange(value, cursorPos);

        // Check if starting new bullet
        const lines = value.split('\n');
        const currentLineIndex = getCurrentLineIndex(value, cursorPos);
        const currentLine = lines[currentLineIndex];
        
        if (currentLine === '- ' || currentLine === '• ') {
          // Show bullet suggestions
          setShowBullets(true);
          setBulletSuggestions([
            'Led development of new features',
            'Collaborated with cross-functional teams',
            'Optimized system performance',
          ]);
        } else {
          setShowBullets(false);
        }
      },
      [props.onChange, handleChange]
    );

    /**
     * Handle key down.
     */
    const handleKeyDownWrapper = useCallback(
      (event: React.KeyboardEvent) => {
        props.onKeyDown?.(event);
        handleKeyDown(event);
      },
      [props.onKeyDown, handleKeyDown]
    );

    /**
     * Handle bullet select.
     */
    const handleBulletSelect = useCallback(
      (bullet: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const value = props.value;
        const cursorPos = textarea.selectionStart;
        const lines = value.split('\n');
        const currentLineIndex = getCurrentLineIndex(value, cursorPos);
        
        // Replace current line with bullet
        lines[currentLineIndex] = '- ' + bullet;
        const newValue = lines.join('\n');
        
        props.onChange(newValue);
        setShowBullets(false);
      },
      [props.value, props.onChange]
    );

    /**
     * Get current line index.
     */
    function getCurrentLineIndex(text: string, cursorPos: number): number {
      return text.substring(0, cursorPos).split('\n').length - 1;
    }

    return (
      <div style={{ position: 'relative' }}>
        <WrappedComponent
          {...(props as P)}
          ref={textareaRef}
          onChange={handleTextChange}
          onKeyDown={handleKeyDownWrapper}
          onBlur={handleBlur}
        />

        {/* Auto-complete popup */}
        {showPopup && completions.length > 0 && popupPosition && (
          <AutocompletePopup
            completions={completions}
            selectedIndex={selectedIndex}
            position={popupPosition}
            onAccept={acceptCompletion}
            onDismiss={dismissCompletions}
          />
        )}

        {/* Inline completion */}
        {showInline && inlineCompletion && inlinePosition && (
          <InlineCompletion
            suggestion={inlineCompletion.text}
            cursorPosition={inlinePosition}
            onAccept={acceptCompletion}
            onDismiss={dismissCompletions}
          />
        )}

        {/* Bullet suggestions */}
        {showBullets && (
          <div
            style={{
              position: 'absolute',
              top: 100,
              left: 50,
              zIndex: 1000,
            }}
          >
            <BulletSuggestions
              suggestions={bulletSuggestions}
              sectionType="experience"
              onSelect={handleBulletSelect}
              onDismiss={() => setShowBullets(false)}
            />
          </div>
        )}
      </div>
    );
  };
}

export default withAutocomplete;
