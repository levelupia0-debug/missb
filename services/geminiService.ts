/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const sendMessageToGemini = async (
  history: { role: string; text: string }[],
  newMessage: string
): Promise<string> => {
  try {
    const response = await fetch('/api/concierge/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, message: newMessage })
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.text || 'How may I assist you with your appointment today?';
  } catch (error) {
    console.error('Concierge API Error:', error);
    return 'I apologize, but I am having trouble reaching our atelier archives right now. Please explore our services or use the booking calendar directly.';
  }
};
