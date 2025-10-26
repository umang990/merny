// QuestionsStep.jsx - FIXED WITH PROPER STREAMING ANIMATIONS
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CodeRainAnimation = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const codeSnippets = [
      "const merny = new AI();", "merny.build(project);", "return <FullStack />;",
      "useEffect(() => { create(); });", "import { MERN } from 'merny';",
      "opacity: 1; transition: all 0.5s;", "let promise = resolve(true);",
      "// Building next-gen apps...", "<MERNYComponent priority='high' />",
      "function generateCode(data) { ... }", "await deploy.toCloud();",
    ];

    const fontSize = 14;
    const lines = [];
    const numLines = 50;

    class CodeLine {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.text = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
        this.charIndex = 0; this.alpha = 0; this.life = 0;
        this.maxLife = 200 + Math.random() * 200;
        this.typingSpeed = 2 + Math.random() * 2;
      }
      draw() {
        this.life++;
        if (this.life < this.maxLife * 0.2) this.alpha = Math.min(this.alpha + 0.05, 0.25);
        else if (this.life > this.maxLife * 0.8) this.alpha = Math.max(this.alpha - 0.01, 0);
        if (this.life % this.typingSpeed < 1 && this.charIndex < this.text.length) this.charIndex++;
        ctx.font = `${fontSize}px monospace`;
        ctx.fillStyle = `rgba(174, 154, 100, ${this.alpha})`;
        ctx.fillText(this.text.substring(0, this.charIndex), this.x, this.y);
        if (this.life >= this.maxLife) this.reset();
      }
    }

    for (let i = 0; i < numLines; i++) lines.push(new CodeLine());
    
    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lines.forEach(line => line.draw());
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    const handleResize = () => { 
      if (canvas) { 
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
      } 
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => { 
      window.removeEventListener('resize', handleResize); 
      cancelAnimationFrame(animationFrameId); 
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }} />;
};

const QuestionsStep = ({
  projectData,
  questions,
  setQuestions,
  answers,
  setAnswers,
  nextStep,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [streamingText, setStreamingText] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Connecting to AI...');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const abortControllerRef = useRef(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (questions?.length > 0 || !projectData?._id || fetchedRef.current) {
      if (questions?.length > 0) {
        console.log('✅ Questions already loaded');
      }
      return;
    }

    fetchedRef.current = true;
    console.log("📋 Starting question generation for project:", projectData._id);

    const fetchQuestionsWithStreaming = async () => {
      setLoading(true);
      setError(null);
      setLoadingMessage('🌊 Connecting to AI...');
      setIsStreaming(false);
      
      abortControllerRef.current = new AbortController();

      try {
        console.log("📡 Starting STREAMING request");
        setLoadingMessage('🌊 AI is thinking...');
        setIsStreaming(true);
        
        const response = await fetch(`${API_BASE_URL}/api/project/questions-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: projectData._id }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let receivedAnyData = false;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Stream complete');
            break;
          }
          
          receivedAnyData = true;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'chunk' && data.chunk) {
                  setStreamingText(prev => {
                    const newText = prev + data.chunk;
                    return newText.length > 2000 ? newText.slice(-2000) : newText;
                  });
                  setLoadingMessage('✨ Generating questions...');
                } else if (data.type === 'progress' && data.count) {
                  setQuestionCount(data.count);
                  setLoadingMessage(`✨ Generated ${data.count} questions so far...`);
                  console.log(`📊 Progress: ${data.count} questions`);
                } else if (data.type === 'complete' && data.questions) {
                  console.log('✅ Questions received:', data.questions.length);
                  setQuestions(data.questions);
                  setLoading(false);
                  setStreamingText('');
                  setQuestionCount(0);
                  setIsStreaming(false);
                  return;
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseErr) {
                console.warn('⚠️ Parse error:', parseErr.message);
              }
            }
          }
        }

        if (!receivedAnyData) {
          throw new Error('No data received from stream');
        }

      } catch (streamErr) {
        if (streamErr.name === 'AbortError') {
          console.log('⚠️ Stream aborted');
          return;
        }
        
        console.warn('⚠️ Streaming failed, falling back to non-streaming:', streamErr.message);
        
        // FALLBACK TO NON-STREAMING
        try {
          setIsStreaming(false);
          setLoadingMessage('⏳ Generating questions (this may take 30-60 seconds)...');
          setStreamingText('');
          setQuestionCount(0);
          
          const res = await axios.post(
            `${API_BASE_URL}/api/project/questions`,
            { projectId: projectData._id },
            {
              timeout: 90000,
              signal: abortControllerRef.current.signal
            }
          );

          if (res.data?.success && res.data?.questions) {
            console.log('✅ Questions received via non-streaming:', res.data.questions.length);
            setQuestions(res.data.questions);
            setError(null);
          } else {
            throw new Error("Invalid response format");
          }
        } catch (fallbackErr) {
          if (fallbackErr.name === 'AbortError' || fallbackErr.name === 'CanceledError') {
            console.log('⚠️ Fallback request aborted');
            return;
          }
          throw fallbackErr;
        }
      } finally {
        setLoading(false);
        setStreamingText('');
        setQuestionCount(0);
        setIsStreaming(false);
      }
    };

    fetchQuestionsWithStreaming().catch(err => {
      console.error('❌ Error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load questions');
      setQuestions([]);
      setLoading(false);
      setIsStreaming(false);
    });
    
    return () => {
      if (abortControllerRef.current) {
        console.log('🧹 Cleanup: aborting request');
        abortControllerRef.current.abort();
      }
    };
  }, [projectData?._id, questions?.length, setQuestions]);

  const handleChange = (key, value) => {
    setAnswers({ ...answers, [key]: value });
  };

  const handleNext = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!answers[currentQuestion.key]) {
      alert(`Please select an answer before proceeding.`);
      return;
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!answers[currentQuestion.key]) {
      alert(`Please answer: ${currentQuestion.question}`);
      return;
    }
    
    const unanswered = questions.find(q => !answers[q.key]);
    if (unanswered) {
      alert(`Please answer all questions before proceeding.`);
      return;
    }
    
    nextStep();
  };

  const handleRetry = () => {
    fetchedRef.current = false;
    setError(null);
    setQuestions([]);
    setLoading(false);
    setStreamingText('');
    setQuestionCount(0);
    setIsStreaming(false);
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&display=swap');
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    
    @keyframes blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
    
    .gradient-text {
      background: linear-gradient(135deg, #AE9A64 0%, #C0B084 50%, #AE9A64 100%);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradient-shift 3s ease infinite;
    }
    
    @keyframes gradient-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    .streaming-text {
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      color: #C0B084;
      white-space: pre-wrap;
      max-height: 280px;
      overflow-y: auto;
      line-height: 1.6;
      position: relative;
    }
    
    .streaming-text::after {
      content: '▊';
      animation: blink 1s step-end infinite;
      color: #AE9A64;
    }
    
    .option-label {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-radius: 12px;
      cursor: pointer;
      border: 2px solid rgba(255, 255, 255, 0.1);
      background-color: rgba(54, 54, 54, 0.5);
      transition: all 0.3s ease;
    }
    
    .option-label:hover {
      background-color: rgba(70, 70, 70, 0.6);
      border-color: rgba(174, 154, 100, 0.3);
      transform: translateX(4px);
    }
    
    .option-label.selected {
      background-color: rgba(174, 154, 100, 0.15);
      border-color: #AE9A64;
    }
    
    .form-button {
      padding: 16px 32px;
      border: none;
      border-radius: 50px;
      background: linear-gradient(135deg, #AE9A64 0%, #C0B084 100%);
      color: #212121;
      font-size: 1.05rem;
      font-weight: 600;
      font-family: 'Exo 2', sans-serif;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(174, 154, 100, 0.3);
    }
    
    .form-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(174, 154, 100, 0.4);
    }
    
    .form-button:active:not(:disabled) {
      transform: scale(0.98);
    }
    
    .form-button:disabled {
      background: #555;
      cursor: not-allowed;
      transform: translateY(0);
      box-shadow: none;
    }
    
    .secondary-button {
      padding: 16px 32px;
      border: 2px solid rgba(174, 154, 100, 0.5);
      background: transparent;
      border-radius: 50px;
      color: #AE9A64;
      font-size: 1.05rem;
      font-weight: 600;
      font-family: 'Exo 2', sans-serif;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .secondary-button:hover:not(:disabled) {
      background-color: rgba(174, 154, 100, 0.1);
      border-color: #AE9A64;
      transform: translateY(-2px);
    }
    
    .secondary-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .progress-dots {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-top: 20px;
    }
    
    .progress-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: rgba(138, 138, 138, 0.3);
      transition: all 0.3s ease;
    }
    
    .progress-dot.answered {
      background: linear-gradient(135deg, #AE9A64 0%, #C0B084 100%);
      box-shadow: 0 0 10px rgba(174, 154, 100, 0.5);
    }
    
    .progress-dot.current {
      background: linear-gradient(135deg, #AE9A64 0%, #C0B084 100%);
      transform: scale(1.3);
      box-shadow: 0 0 15px rgba(174, 154, 100, 0.7);
    }
  `;

  const currentQuestion = (questions && questions.length > 0) ? questions[currentQuestionIndex] : null;
  const isLastQuestion = currentQuestionIndex === (questions?.length || 0) - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <>
      <style>{styles}</style>
      <CodeRainAnimation />

      {loading && (
        <div style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: '#2a2a2a', padding: '48px 40px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontFamily: 'Exo 2, sans-serif', animation: 'fadeInUp 0.6s ease-out' }}>
          <h2 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '16px', textAlign: 'center', letterSpacing: '1px' }}>
            {isStreaming ? '🌊 Generating Questions in Real-Time...' : loadingMessage}
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
            <div style={{ width: '80px', height: '80px', border: '5px solid rgba(174, 154, 100, 0.2)', borderTop: '5px solid #AE9A64', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '24px' }}></div>
            
            <p style={{ fontSize: '1.25rem', color: '#C0B084', fontWeight: '600', marginBottom: '16px', textAlign: 'center', animation: 'pulse 1.5s ease-in-out infinite' }}>
              {loadingMessage}
            </p>
            
            {questionCount > 0 && (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '1.5rem', color: '#AE9A64', fontWeight: '700', marginBottom: '8px' }}>
                  ⚡ {questionCount} questions generated!
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                  {Array.from({ length: Math.min(15, questionCount) }).map((_, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #AE9A64 0%, #C0B084 100%)',
                        boxShadow: '0 0 10px rgba(174, 154, 100, 0.6)',
                        animation: `fadeInUp 0.3s ease-out ${i * 0.1}s backwards`
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {streamingText && isStreaming && (
              <div style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(174, 154, 100, 0.05)', borderRadius: '12px', width: '100%', border: '1px solid rgba(174, 154, 100, 0.3)', maxWidth: '700px' }}>
                <p style={{ fontSize: '0.875rem', color: '#C0B084', marginBottom: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>🔥</span> 
                  Live AI Generation:
                </p>
                <div className="streaming-text">
                  {streamingText}
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '32px', width: '100%', maxWidth: '600px' }}>
              <div style={{ backgroundColor: 'rgba(174, 154, 100, 0.1)', borderLeft: '4px solid #AE9A64', padding: '20px', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.875rem', color: '#C0B084', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600' }}>💡 What's happening:</span>
                </p>
                <ul style={{ marginTop: '12px', fontSize: '0.875rem', color: '#8A8A8A', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', fontWeight: '300' }}>
                  {isStreaming ? (
                    <>
                      <li>✨ AI is crafting personalized questions for your project</li>
                      <li>🎯 Each question appears as it's generated</li>
                      <li>⚡ Watch the magic happen in real-time!</li>
                      <li>📊 Total: 15 questions to understand your needs</li>
                    </>
                  ) : (
                    <>
                      <li>🤖 Connecting to AI...</li>
                      <li>⏳ This may take 30-60 seconds</li>
                      <li>☕ Please wait while we prepare your questions</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#2a2a2a', padding: '48px 40px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontFamily: 'Exo 2, sans-serif', animation: 'fadeInUp 0.6s ease-out' }}>
          <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '24px', textAlign: 'center', letterSpacing: '1px' }}>
            Oops! Something went wrong 😕
          </h2>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #F87171', color: '#F87171', padding: '16px 24px', borderRadius: '8px', marginBottom: '24px' }}>
            <p style={{ fontWeight: '600', fontSize: '1.125rem', marginBottom: '8px' }}>Error</p>
            <p style={{ fontWeight: '300' }}>{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="form-button"
            style={{ width: '100%' }}
          >
            🔄 Try Again
          </button>
        </div>
      )}

      {!loading && !error && currentQuestion && (
        <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: '#2a2a2a', padding: '48px 40px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', fontFamily: 'Exo 2, sans-serif', animation: 'fadeInUp 0.6s ease-out' }}>
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '12px', letterSpacing: '1px' }}>
              Tell Me About Your Project! 💬
            </h2>
            <p style={{ color: '#8A8A8A', fontSize: '1rem', fontWeight: '300', marginBottom: '24px' }}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            
            <div className="progress-dots">
              {questions.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`progress-dot ${
                    answers[questions[idx].key] ? 'answered' : ''
                  } ${idx === currentQuestionIndex ? 'current' : ''}`}
                />
              ))}
            </div>
          </div>

          <div style={{ animation: 'slideInRight 0.4s ease-out', marginBottom: '32px' }} key={currentQuestionIndex}>
            <div style={{ padding: '32px 24px', borderRadius: '12px', border: '2px solid rgba(174, 154, 100, 0.2)', backgroundColor: 'rgba(42, 42, 42, 0.6)' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1.375rem', color: '#E5E5E5', marginBottom: '24px' }}>
                {currentQuestion.question}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentQuestion.options.map((opt, i) => (
                  <label 
                    key={i} 
                    className={`option-label ${answers[currentQuestion.key] === opt ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={currentQuestion.key}
                      value={opt}
                      checked={answers[currentQuestion.key] === opt}
                      onChange={() => handleChange(currentQuestion.key, opt)}
                      style={{ marginRight: '14px', width: '18px', height: '18px', accentColor: '#AE9A64', cursor: 'pointer' }}
                    />
                    <span style={{ color: answers[currentQuestion.key] === opt ? '#C0B084' : '#E5E5E5', fontWeight: answers[currentQuestion.key] === opt ? '600' : '400', fontSize: '1.05rem', transition: 'all 0.2s ease' }}>
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between' }}>
            <button
              onClick={handleBack}
              disabled={isFirstQuestion}
              className="secondary-button"
              style={{ flex: 1 }}
            >
              ← Back
            </button>
            
            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                className="form-button"
                style={{ flex: 2 }}
              >
                ✨ Complete & Build My Project
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="form-button"
                style={{ flex: 2 }}
              >
                Next →
              </button>
            )}
          </div>

          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(174, 154, 100, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: '#C0B084', fontWeight: '500' }}>
              {Object.keys(answers).length} of {questions.length} questions answered
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionsStep;