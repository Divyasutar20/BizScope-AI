import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaPaperPlane, FaTimes, FaCommentDots } from 'react-icons/fa';

function catLabel(key, categories) {
  return categories.find((c) => c.key === key)?.label || key;
}

function generateReply(text, ctx) {
  const t = text.toLowerCase();
  const { hasSearched, selectedLabel, score, analysis, recommendations, categories } = ctx;

  if (!hasSearched) {
    return "I don't have any location analyzed yet — search a place or click the map first, then ask me things like \"what's the best business here?\" or \"how's the competition?\"";
  }

  if (/\b(hi|hello|hey)\b/.test(t)) {
    return `Hi! I'm looking at your ${selectedLabel} analysis right now. Ask me about the score, competitors, or the best business type for this spot.`;
  }

  if (/(best|recommend|suggest|what.*business|which business)/.test(t)) {
    if (!recommendations.length) return "I don't have rankings yet — try clicking the map first.";
    const top3 = recommendations.slice(0, 3)
      .map((r, i) => `${i + 1}. ${catLabel(r.category, categories)} (${r.score}/100)`)
      .join('\n');
    return `Based on this location, here are the top picks:\n${top3}`;
  }

  if (/(competitor|competition)/.test(t)) {
    if (!analysis) return "I don't have competitor data yet for this spot.";
    return `There ${analysis.directCompetitors === 1 ? 'is' : 'are'} ${analysis.directCompetitors} ${selectedLabel.toLowerCase()} competitor${analysis.directCompetitors === 1 ? '' : 's'} within your selected radius — competition level is ${analysis.competitionLevel}.`;
  }

  if (/\bscore\b/.test(t)) {
    if (score === null) return "I don't have a score yet — search a location first.";
    return `The ${selectedLabel} Success Score for this spot is ${score}/100. ${
      score >= 75 ? "That's a strong result!" : score >= 50 ? "That's a moderate result." : "That's on the weaker side — you might want to check a nearby spot or a different business type."
    }`;
  }

  if (/(how.*work|how.*score|how.*calculat)/.test(t)) {
    return "The score blends three things: how many similar businesses (competitors) are already nearby, how much general foot traffic the area has, and how many complementary businesses (like schools near a cafe, or hospitals near a pharmacy) are around to drive demand.";
  }

  if (/(what.*bizscope|what.*this|about)/.test(t)) {
    return "BizScope AI analyzes real map data (from OpenStreetMap) around any point you choose, scores how suitable it is for different business types, and recommends the best options — so you can skip manual ground surveys.";
  }

  if (/help/.test(t)) {
    return 'Try asking me:\n• "What\'s the best business here?"\n• "How\'s the competition?"\n• "What\'s my score?"\n• "How does scoring work?"';
  }

  return "I can help with recommendations, competitor analysis, or your success score for the location you've selected — try asking \"what's the best business here?\"";
}

function ChatBot({ hasSearched, businessCategory, score, analysis, recommendations, categories }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hi! I'm BizBot 🤖 — ask me about the score, competitors, or best business type for any location you analyze." },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input };
    const selectedLabel = catLabel(businessCategory, categories);
    const reply = generateReply(input, { hasSearched, selectedLabel, score, analysis, recommendations, categories });
    setMessages((prev) => [...prev, userMsg, { sender: 'bot', text: reply }]);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1300]">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 h-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col mb-3 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaRobot className="text-teal-400" />
                <span className="font-semibold text-sm">BizBot</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] text-xs px-3 py-2 rounded-xl whitespace-pre-line ${
                      m.sender === 'user'
                        ? 'bg-slate-900 text-white rounded-br-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="p-2 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this location…"
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-teal-500"
              />
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs">
                <FaPaperPlane />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-slate-900 text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <FaTimes size={20} /> : <FaCommentDots size={22} />}
      </button>
    </div>
  );
}

export default ChatBot;