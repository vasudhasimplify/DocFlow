/**
 * Clipboard Utility
 * Provides safe clipboard operations with fallbacks for different browsers/environments
 */

/**
 * Safely copy text to clipboard with fallback for environments without Clipboard API
 * @param text - Text to copy to clipboard
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers or non-HTTPS contexts
    return copyToClipboardFallback(text);
  } catch (error) {
    console.error('Clipboard write failed:', error);
    
    // Try fallback if modern API fails
    return copyToClipboardFallback(text);
  }
}

/**
 * Fallback clipboard copy using deprecated execCommand
 * @param text - Text to copy
 * @returns true if successful, false otherwise
 */
function copyToClipboardFallback(text: string): boolean {
  try {
    // Create temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make it invisible but ensure it's in the document
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '1px';
    textArea.style.height = '1px';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // Try to copy
    const successful = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textArea);
    
    return successful;
  } catch (error) {
    console.error('Fallback clipboard copy failed:', error);
    return false;
  }
}

/**
 * Read text from clipboard
 * @returns Promise that resolves to clipboard text or null if failed
 */
export async function readFromClipboard(): Promise<string | null> {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
    
    // No fallback for reading - requires modern browser
    console.warn('Clipboard read not supported in this environment');
    return null;
  } catch (error) {
    console.error('Clipboard read failed:', error);
    return null;
  }
}

/**
 * Check if clipboard API is available
 * @returns true if clipboard operations are supported
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard && (navigator.clipboard.writeText || navigator.clipboard.readText));
}
